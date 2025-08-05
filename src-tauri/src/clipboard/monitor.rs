use anyhow::Result;
use arboard::Clipboard;
use cocoa::base::{id, nil};
use cocoa::foundation::NSString;
use objc::{class, msg_send, sel, sel_impl};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, Mutex};
use tokio::time::sleep;
use sha2::{Sha256, Digest};

use crate::models::{ClipboardEntry, ContentType};
use crate::clipboard::processor::ContentProcessor;
use crate::utils::app_detector::get_active_app;

pub struct ClipboardMonitor {
    clipboard: Arc<Mutex<Clipboard>>,
    last_hash: Arc<Mutex<Option<String>>>,
    tx: broadcast::Sender<ClipboardEntry>,
    processor: Arc<ContentProcessor>,
}

impl ClipboardMonitor {
    pub fn new(tx: broadcast::Sender<ClipboardEntry>, processor: Arc<ContentProcessor>) -> Result<Self> {
        let clipboard = Arc::new(Mutex::new(Clipboard::new()?));
        let last_hash = Arc::new(Mutex::new(None));

        Ok(Self {
            clipboard,
            last_hash,
            tx,
            processor,
        })
    }

    pub async fn start_monitoring(&self) {
        let clipboard = Arc::clone(&self.clipboard);
        let last_hash = Arc::clone(&self.last_hash);
        let tx = self.tx.clone();
        let processor = Arc::clone(&self.processor);

        tokio::spawn(async move {
            loop {
                if let Err(e) = Self::check_clipboard(&clipboard, &last_hash, &tx, &processor).await {
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
            if !text.is_empty() {
                let hash = Self::calculate_hash(text.as_bytes());
                
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
                    let source_app = get_active_app();
                    let entry = ClipboardEntry::new(
                        ContentType::Text,
                        Some(text),
                        hash,
                        source_app,
                        None,
                    );
                    
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
                // 处理图片
                match processor.process_image(bytes).await {
                    Ok(file_path) => {
                        let source_app = get_active_app();
                        let entry = ClipboardEntry::new(
                            ContentType::Image,
                            Some(file_path.clone()),
                            hash,
                            source_app,
                            Some(file_path),
                        );
                        
                        let _ = tx.send(entry);
                    }
                    Err(e) => eprintln!("处理图片失败: {}", e),
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
                    let source_app = get_active_app();
                    let entry = ClipboardEntry::new(
                        ContentType::File,
                        Some(content.clone()),
                        hash,
                        source_app,
                        Some(content),
                    );
                    
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
        std::panic::catch_unwind(|| {
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
        }).unwrap_or_else(|_| {
            eprintln!("从剪切板获取文件路径时发生异常，已安全处理");
            None
        })
    }
}