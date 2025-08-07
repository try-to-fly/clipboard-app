use anyhow::Result;
use arboard::Clipboard;
use cocoa::base::{id, nil};
use cocoa::foundation::NSString;
use objc::{class, msg_send, sel, sel_impl};
use serde_json;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, Mutex};
use tokio::time::sleep;

use crate::clipboard::content_detector::ContentDetector;
use crate::clipboard::processor::ContentProcessor;
use crate::models::{ClipboardEntry, ContentType};
use crate::utils::app_detector::{get_active_app, get_active_app_info};

pub struct ClipboardMonitor {
    clipboard: Arc<Mutex<Clipboard>>,
    last_hash: Arc<Mutex<Option<String>>>,
    tx: broadcast::Sender<ClipboardEntry>,
    processor: Arc<ContentProcessor>,
}

impl ClipboardMonitor {
    pub fn new(
        tx: broadcast::Sender<ClipboardEntry>,
        processor: Arc<ContentProcessor>,
    ) -> Result<Self> {
        let clipboard = Arc::new(Mutex::new(Clipboard::new()?));
        let last_hash = Arc::new(Mutex::new(None));

        Ok(Self {
            clipboard,
            last_hash,
            tx,
            processor,
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
        let clipboard = Arc::clone(&self.clipboard);
        let last_hash = Arc::clone(&self.last_hash);
        let tx = self.tx.clone();
        let processor = Arc::clone(&self.processor);

        tokio::spawn(async move {
            loop {
                if let Err(e) = Self::check_clipboard(&clipboard, &last_hash, &tx, &processor).await
                {
                    eprintln!("剪切板检查错误: {}", e);
                }
                sleep(Duration::from_millis(500)).await;
            }
        });
    }

    async fn check_clipboard(
        clipboard: &Arc<Mutex<Clipboard>>,
        last_hash: &Arc<Mutex<Option<String>>>,
        tx: &broadcast::Sender<ClipboardEntry>,
        processor: &Arc<ContentProcessor>,
    ) -> Result<()> {
        // 检查文本内容
        let text_result = {
            let mut clipboard = clipboard.lock().await;
            clipboard.get_text()
        };

        if let Ok(text) = text_result {
            // 先trim处理文本
            let trimmed_text = text.trim();
            if !trimmed_text.is_empty() {
                // 检查是否是base64图片URL（避免循环记录）
                let is_base64_image =
                    trimmed_text.starts_with("data:image/") && trimmed_text.contains(";base64,");
                if is_base64_image {
                    println!("[ClipboardMonitor] 跳过base64图片URL，避免循环记录");
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
                    let app_info = get_active_app_info();

                    // 如果来源是自己的应用，跳过
                    if let Some(ref app_info) = app_info {
                        if app_info.name.contains("clipboard-app")
                            || app_info.name.contains("Clipboard App")
                        {
                            println!(
                                "[ClipboardMonitor] 跳过自己应用的复制操作: {}",
                                app_info.name
                            );
                            return Ok(());
                        }
                    }

                    // 检测内容子类型
                    let (subtype, metadata) = ContentDetector::detect(trimmed_text);
                    println!(
                        "[ClipboardMonitor] 检测到内容类型: {:?}, 内容: {}",
                        subtype,
                        trimmed_text.chars().take(50).collect::<String>()
                    );

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

        // 检查图片内容
        let image_result = {
            let mut clipboard = clipboard.lock().await;
            clipboard.get_image()
        };

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
                println!(
                    "[ClipboardMonitor] 检测到新图片: {}x{}, 数据大小: {} 字节",
                    width,
                    height,
                    bytes.len()
                );
                let app_info = get_active_app_info();

                // 如果来源是自己的应用，跳过
                if let Some(ref app_info) = app_info {
                    if app_info.name.contains("clipboard-app")
                        || app_info.name.contains("Clipboard App")
                    {
                        println!(
                            "[ClipboardMonitor] 跳过自己应用的图片复制操作: {}",
                            app_info.name
                        );
                        return Ok(());
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
                    Err(e) => {
                        eprintln!("[ClipboardMonitor] 使用尺寸处理失败，尝试自动检测: {}", e);
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
                            Err(e) => eprintln!("[ClipboardMonitor] 处理图片失败: {}", e),
                        }
                    }
                }
                return Ok(());
            }
        }

        // 检查文件路径
        let file_paths = Self::get_file_paths_from_pasteboard();

        if let Some(file_paths) = file_paths {
            if !file_paths.is_empty() {
                let content = file_paths.join("\n");
                let hash = Self::calculate_hash(content.as_bytes());

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
                    let app_info = get_active_app_info();
                    let mut entry = ClipboardEntry::new(
                        ContentType::File,
                        Some(content.clone()),
                        hash,
                        app_info.as_ref().map(|info| info.name.clone()),
                        Some(content),
                    );
                    entry.app_bundle_id = app_info.as_ref().and_then(|info| info.bundle_id.clone());

                    let _ = tx.send(entry);
                }
            }
        }

        Ok(())
    }

    fn calculate_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    fn get_file_paths_from_pasteboard() -> Option<Vec<String>> {
        // 使用 std::panic::catch_unwind 来捕获可能的外部异常
        let result = std::panic::catch_unwind(|| {
            unsafe {
                let pasteboard: id = msg_send![class!(NSPasteboard), generalPasteboard];
                if pasteboard == nil {
                    return None;
                }

                let types: id = msg_send![pasteboard, types];
                if types == nil {
                    return None;
                }

                let file_url_type: id = NSString::alloc(nil).init_str("public.file-url");
                if file_url_type == nil {
                    return None;
                }

                let has_files: bool = msg_send![types, containsObject:file_url_type];

                if has_files {
                    let urls: id = msg_send![pasteboard, propertyListForType:file_url_type];
                    if urls != nil {
                        let count: usize = msg_send![urls, count];

                        let mut paths = Vec::new();
                        for i in 0..count {
                            // 为每个索引访问添加边界检查
                            if i >= count {
                                break;
                            }

                            let url: id = msg_send![urls, objectAtIndex:i];
                            if url == nil {
                                continue;
                            }

                            let path: id = msg_send![url, path];
                            if path == nil {
                                continue;
                            }

                            let c_str: *const i8 = msg_send![path, UTF8String];

                            if !c_str.is_null() {
                                match std::ffi::CStr::from_ptr(c_str).to_str() {
                                    Ok(path_str) => paths.push(path_str.to_string()),
                                    Err(_) => continue, // 跳过无效的UTF-8字符串
                                }
                            }
                        }
                        Some(paths)
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        });

        match result {
            Ok(value) => value,
            Err(_) => {
                eprintln!("从剪切板获取文件路径时发生异常，已安全处理");
                None
            }
        }
    }
}
