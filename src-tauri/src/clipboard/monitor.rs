use anyhow::Result;
use serde_json;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, Mutex};
use tokio::time::sleep;

use crate::clipboard::content_detector::ContentDetector;
use crate::clipboard::processor::ContentProcessor;
use crate::config::ConfigManager;
use crate::models::{ClipboardEntry, ContentType};
use crate::utils::app_detector::get_active_app_info;

pub struct ClipboardMonitor {
    last_hash: Arc<Mutex<Option<String>>>,
    tx: broadcast::Sender<ClipboardEntry>,
    processor: Arc<ContentProcessor>,
    config_manager: Arc<Mutex<ConfigManager>>,
}

impl ClipboardMonitor {
    pub fn new(
        tx: broadcast::Sender<ClipboardEntry>,
        processor: Arc<ContentProcessor>,
        config_manager: Arc<Mutex<ConfigManager>>,
    ) -> Result<Self> {
        let last_hash = Arc::new(Mutex::new(None));

        Ok(Self {
            last_hash,
            tx,
            processor,
            config_manager,
        })
    }

    fn get_saved_file_size(file_path: &str) -> Option<u64> {
        // 将相对路径转换为绝对路径
        let absolute_path = if file_path.starts_with("imgs/") {
            let config_dir = dirs::config_dir()?;
            let app_dir = config_dir.join("clipboard-app");
            app_dir.join(file_path)
        } else {
            std::path::PathBuf::from(file_path)
        };

        std::fs::metadata(absolute_path).ok().map(|meta| meta.len())
    }

    pub async fn start_monitoring(&self) {
        let last_hash = Arc::clone(&self.last_hash);
        let tx = self.tx.clone();
        let processor = Arc::clone(&self.processor);
        let config_manager = Arc::clone(&self.config_manager);

        tokio::spawn(async move {
            loop {
                // 先检查当前应用是否是自己
                let app_info = get_active_app_info();
                let is_self_app = if let Some(ref info) = app_info {
                    info.bundle_id == Some("com.clipboard-app.clipboardmanager".to_string())
                        || info.name.contains("clipboard-app")
                        || info.name.contains("Clipboard App")
                        || info.name.contains("剪切板管理器")
                } else {
                    false
                };

                // 如果当前应用是自己，延长检查间隔，减少干扰
                if is_self_app {
                    sleep(Duration::from_millis(2000)).await;
                    continue;
                }

                if let Err(e) =
                    Self::check_clipboard(&last_hash, &tx, &processor, &config_manager)
                        .await
                {
                    eprintln!("剪切板检查错误: {}", e);
                }
                sleep(Duration::from_millis(500)).await;
            }
        });
    }

    async fn check_clipboard(
        last_hash: &Arc<Mutex<Option<String>>>,
        tx: &broadcast::Sender<ClipboardEntry>,
        processor: &Arc<ContentProcessor>,
        config_manager: &Arc<Mutex<ConfigManager>>,
    ) -> Result<()> {
        // 获取当前活跃应用信息
        let app_info = get_active_app_info();

        // 检查文本内容 - 使用独立的剪切板实例，避免长时间锁定
        let text_result = tokio::task::spawn_blocking(|| {
            match arboard::Clipboard::new() {
                Ok(mut temp_clipboard) => temp_clipboard.get_text(),
                Err(e) => Err(e)
            }
        }).await.unwrap_or_else(|_| Err(arboard::Error::ClipboardNotSupported));

        if let Ok(text) = text_result {
            // 先trim处理文本
            let trimmed_text = text.trim();
            if !trimmed_text.is_empty() {
                // 检查是否是base64图片URL（避免循环记录）
                let is_base64_image =
                    trimmed_text.starts_with("data:image/") && trimmed_text.contains(";base64,");
                if is_base64_image {
                    return Ok(());
                }

                let hash = Self::calculate_hash(trimmed_text.as_bytes());

                let should_send = {
                    let mut last = last_hash.lock().await;
                    if last.as_ref() != Some(&hash) {
                        *last = Some(hash.clone());
                        true
                    } else {
                        false
                    }
                };

                if should_send {
                    // 检查是否是被排除的应用
                    if let Some(ref app_info) = app_info {
                        if let Some(bundle_id) = &app_info.bundle_id {
                            let config_guard = config_manager.lock().await;
                            if config_guard.is_app_excluded(bundle_id) {
                                return Ok(());
                            }

                            // 检查文本大小限制
                            if !config_guard.is_text_size_valid(trimmed_text) {
                                return Ok(());
                            }
                        }
                    }

                    // 检测内容子类型
                    let (subtype, metadata) = ContentDetector::detect(trimmed_text);

                    // 将metadata转换为JSON字符串
                    let metadata_json = metadata.map(|m| serde_json::to_string(&m).ok()).flatten();

                    let mut entry = ClipboardEntry::new(
                        ContentType::Text,
                        Some(trimmed_text.to_string()),
                        hash,
                        app_info.as_ref().map(|info| info.name.clone()),
                        None,
                    );

                    // 设置子类型、元数据和bundle ID
                    // 使用serde_json::to_value获取正确的snake_case字符串
                    let subtype_str = serde_json::to_value(&subtype)
                        .ok()
                        .and_then(|v| v.as_str().map(|s| s.to_string()))
                        .unwrap_or_else(|| "plain_text".to_string());
                    entry.content_subtype = Some(subtype_str);
                    entry.metadata = metadata_json;
                    entry.app_bundle_id = app_info.as_ref().and_then(|info| info.bundle_id.clone());

                    let _ = tx.send(entry);
                    return Ok(());
                }
            }
        }

        // 检查图片内容 - 使用独立的剪切板实例
        let image_result = tokio::task::spawn_blocking(|| {
            match arboard::Clipboard::new() {
                Ok(mut temp_clipboard) => temp_clipboard.get_image(),
                Err(e) => Err(e)
            }
        }).await.unwrap_or_else(|_| Err(arboard::Error::ClipboardNotSupported));

        if let Ok(image_data) = image_result {
            // arboard 返回的图片数据包含宽高信息
            let width = image_data.width;
            let height = image_data.height;
            let bytes = image_data.bytes.as_ref();

            let hash = Self::calculate_hash(bytes);

            let should_send = {
                let mut last = last_hash.lock().await;
                if last.as_ref() != Some(&hash) {
                    *last = Some(hash.clone());
                    true
                } else {
                    false
                }
            };

            if should_send {
                // 检查是否是被排除的应用
                if let Some(ref app_info) = app_info {
                    if let Some(bundle_id) = &app_info.bundle_id {
                        let config_guard = config_manager.lock().await;
                        if config_guard.is_app_excluded(bundle_id) {
                            return Ok(());
                        }
                    }
                }

                // 使用宽高信息处理图片
                match processor
                    .process_image_with_dimensions(bytes, width as u32, height as u32)
                    .await
                {
                    Ok(image_info) => {
                        // 创建图片元数据，使用实际压缩后的文件大小
                        let image_metadata = serde_json::json!({
                            "image_metadata": {
                                "width": image_info.width,
                                "height": image_info.height,
                                "file_size": image_info.actual_size,
                                "format": "png"
                            }
                        });

                        let mut entry = ClipboardEntry::new(
                            ContentType::Image,
                            Some(image_info.file_path.clone()),
                            hash,
                            app_info.as_ref().map(|info| info.name.clone()),
                            Some(image_info.file_path),
                        );
                        entry.app_bundle_id =
                            app_info.as_ref().and_then(|info| info.bundle_id.clone());
                        entry.metadata = Some(image_metadata.to_string());

                        let _ = tx.send(entry);
                    }
                    Err(_) => {
                        // 降级到自动检测
                        match processor.process_image(bytes).await {
                            Ok(file_path) => {
                                // 获取实际保存的文件大小
                                let actual_size = Self::get_saved_file_size(&file_path)
                                    .unwrap_or(bytes.len() as u64);

                                // 创建图片元数据（使用压缩后的文件大小）
                                let image_metadata = serde_json::json!({
                                    "image_metadata": {
                                        "width": width as u32,
                                        "height": height as u32,
                                        "file_size": actual_size,
                                        "format": "png"
                                    }
                                });

                                let mut entry = ClipboardEntry::new(
                                    ContentType::Image,
                                    Some(file_path.clone()),
                                    hash,
                                    app_info.as_ref().map(|info| info.name.clone()),
                                    Some(file_path),
                                );
                                entry.app_bundle_id =
                                    app_info.as_ref().and_then(|info| info.bundle_id.clone());
                                entry.metadata = Some(image_metadata.to_string());

                                let _ = tx.send(entry);
                            }
                            Err(_) => {}
                        }
                    }
                }
                return Ok(());
            }
        }

        Ok(())
    }

    fn calculate_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }
}
