use crate::config::AppConfig;
use crate::models::{ClipboardEntry, Statistics};
use crate::state::AppState;
use crate::updater::{UpdateInfo, UpdateManager};
use crate::utils::app_icon_extractor::AppIconExtractor;
use crate::utils::app_list::{AppListManager, InstalledApp};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::{State, Window};
use tauri_plugin_aptabase::EventTracker;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStatistics {
    pub db_size_bytes: u64,
    pub images_size_bytes: u64,
    pub total_entries: i64,
    pub text_entries: i64,
    pub image_entries: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupResult {
    pub entries_removed: u32,
    pub images_removed: u32,
    pub size_freed_bytes: u64,
}

#[tauri::command]
pub async fn start_monitoring(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let result = state.start_monitoring().await.map_err(|e| e.to_string());
    if result.is_ok() {
        let app_handle = app.clone();
        tokio::spawn(async move {
            let _ = app_handle.track_event("monitoring_started", None);
        });
    }
    result
}

#[tauri::command]
pub async fn stop_monitoring(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let result = state.stop_monitoring().await.map_err(|e| e.to_string());
    if result.is_ok() {
        let app_handle = app.clone();
        tokio::spawn(async move {
            let _ = app_handle.track_event("monitoring_stopped", None);
        });
    }
    result
}

#[tauri::command]
pub async fn get_clipboard_history(
    state: State<'_, AppState>,
    limit: Option<i32>,
    offset: Option<i32>,
    search: Option<String>,
) -> Result<Vec<ClipboardEntry>, String> {
    state
        .get_clipboard_history(limit, offset, search)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_favorite(app: tauri::AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    let result = state.toggle_favorite(id).await.map_err(|e| e.to_string());
    if result.is_ok() {
        let app_handle = app.clone();
        tokio::spawn(async move {
            let _ = app_handle.track_event("favorite_toggled", None);
        });
    }
    result
}

#[tauri::command]
pub async fn delete_entry(app: tauri::AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    let result = state.delete_entry(id).await.map_err(|e| e.to_string());
    if result.is_ok() {
        let app_handle = app.clone();
        tokio::spawn(async move {
            let _ = app_handle.track_event("entry_deleted", None);
        });
    }
    result
}

#[tauri::command]
pub async fn clear_history(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let result = state.clear_history().await.map_err(|e| e.to_string());
    if result.is_ok() {
        let app_handle = app.clone();
        tokio::spawn(async move {
            let _ = app_handle.track_event("history_cleared", None);
        });
    }
    result
}

#[tauri::command]
pub async fn get_statistics(state: State<'_, AppState>) -> Result<Statistics, String> {
    state.get_statistics().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_to_clipboard(app: tauri::AppHandle, state: State<'_, AppState>, content: String) -> Result<(), String> {
    let result = state
        .copy_to_clipboard(content)
        .await
        .map_err(|e| e.to_string());
    if result.is_ok() {
        let app_handle = app.clone();
        tokio::spawn(async move {
            let _ = app_handle.track_event("item_copied", None);
        });
    }
    result
}

#[tauri::command]
pub async fn paste_text(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    content: String,
) -> Result<(), String> {
    state
        .paste_text(content, Some(app_handle))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn paste_image(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    file_path: String,
) -> Result<(), String> {
    state
        .paste_image(file_path, Some(app_handle))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_file_with_system(file_path: String) -> Result<(), String> {
    use std::path::PathBuf;
    use std::process::Command;

    println!("[open_file_with_system] 打开文件: {}", file_path);

    // 如果是相对路径（如 imgs/xxx.png），转换为绝对路径
    let absolute_path = if file_path.starts_with("imgs/") {
        let config_dir =
            dirs::config_dir().ok_or_else(|| "Unable to get config directory".to_string())?;
        let app_dir = config_dir.join("clipboard-app");
        app_dir.join(&file_path)
    } else {
        PathBuf::from(&file_path)
    };

    if !absolute_path.exists() {
        return Err(format!("File not found: {:?}", absolute_path));
    }

    // 在 macOS 上使用 open 命令
    #[cfg(target_os = "macos")]
    {
        let result = Command::new("open").arg(&absolute_path).spawn();

        match result {
            Ok(_) => {
                println!("[open_file_with_system] 成功打开文件");
                Ok(())
            }
            Err(e) => {
                println!("[open_file_with_system] 打开文件失败: {}", e);
                Err(format!("Failed to open file: {}", e))
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("This feature is only supported on macOS".to_string())
    }
}

#[tauri::command]
pub async fn get_image_url(file_path: String) -> Result<String, String> {
    use base64::Engine;
    use std::fs;
    use std::path::PathBuf;

    // println!("[get_image_url] 请求加载图片: {}", file_path);

    // 如果是相对路径（如 imgs/xxx.png），转换为绝对路径
    let absolute_path = if file_path.starts_with("imgs/") {
        let config_dir =
            dirs::config_dir().ok_or_else(|| "Unable to get config directory".to_string())?;
        let app_dir = config_dir.join("clipboard-app");

        // 确保 imgs 目录存在
        let imgs_dir = app_dir.join("imgs");
        if !imgs_dir.exists() {
            println!("[get_image_url] 创建 imgs 目录: {:?}", imgs_dir);
            if let Err(e) = fs::create_dir_all(&imgs_dir) {
                return Err(format!("Failed to create imgs directory: {}", e));
            }
        }

        app_dir.join(&file_path)
    } else {
        PathBuf::from(&file_path)
    };

    // println!("[get_image_url] 绝对路径: {:?}", absolute_path);

    if !absolute_path.exists() {
        println!("[get_image_url] 文件不存在: {:?}", absolute_path);
        // 列出 imgs 目录中的文件帮助调试
        if let Some(parent) = absolute_path.parent() {
            if parent.exists() {
                println!("[get_image_url] 目录 {:?} 中的文件:", parent);
                if let Ok(entries) = fs::read_dir(parent) {
                    for entry in entries.flatten() {
                        println!("  - {:?}", entry.file_name());
                    }
                }
            }
        }
        return Err(format!("File not found: {:?}", absolute_path));
    }

    match fs::read(&absolute_path) {
        Ok(data) => {
            // println!("[get_image_url] 成功读取文件，大小: {} 字节", data.len());

            let extension = absolute_path
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("png");

            let mime_type = match extension.to_lowercase().as_str() {
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "gif" => "image/gif",
                "webp" => "image/webp",
                "bin" => {
                    // 对于 .bin 文件，尝试检测实际格式
                    if data.len() >= 4 {
                        if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
                            "image/png"
                        } else if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
                            "image/jpeg"
                        } else if data.starts_with(&[0x47, 0x49, 0x46, 0x38]) {
                            "image/gif"
                        } else if data.starts_with(&[0x52, 0x49, 0x46, 0x46])
                            && data.len() >= 12
                            && &data[8..12] == b"WEBP"
                        {
                            "image/webp"
                        } else {
                            "image/png" // 默认使用 PNG
                        }
                    } else {
                        "image/png"
                    }
                }
                _ => "image/png",
            };

            // println!("[get_image_url] MIME 类型: {}", mime_type);

            let base64_data = base64::engine::general_purpose::STANDARD.encode(&data);
            Ok(format!("data:{};base64,{}", mime_type, base64_data))
        }
        Err(e) => {
            println!("[get_image_url] 读取文件失败: {}", e);
            Err(format!("Failed to read file: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_app_icon(bundle_id: String) -> Result<Option<String>, String> {
    use base64::Engine;
    use std::fs;

    // println!("[get_app_icon] 请求应用图标: {}", bundle_id);

    let extractor = AppIconExtractor::new().map_err(|e| e.to_string())?;

    // 首先检查缓存
    if let Some(cached_path) = extractor.get_cached_icon_path(&bundle_id) {
        // println!("[get_app_icon] 找到缓存图标: {:?}", cached_path);

        match fs::read(&cached_path) {
            Ok(data) => {
                let base64_data = base64::engine::general_purpose::STANDARD.encode(&data);
                return Ok(Some(format!("data:image/png;base64,{}", base64_data)));
            }
            Err(e) => {
                println!("[get_app_icon] 读取缓存图标失败: {}", e);
                // 继续尝试提取新图标
            }
        }
    }

    // 提取并缓存图标
    match extractor.extract_and_cache_icon(&bundle_id) {
        Ok(Some(icon_path)) => {
            println!("[get_app_icon] 成功提取图标: {:?}", icon_path);

            match fs::read(&icon_path) {
                Ok(data) => {
                    let base64_data = base64::engine::general_purpose::STANDARD.encode(&data);
                    Ok(Some(format!("data:image/png;base64,{}", base64_data)))
                }
                Err(e) => {
                    println!("[get_app_icon] 读取图标文件失败: {}", e);
                    Ok(None)
                }
            }
        }
        Ok(None) => {
            println!("[get_app_icon] 无法为 {} 获取图标", bundle_id);
            Ok(None)
        }
        Err(e) => {
            println!("[get_app_icon] 提取图标出错: {}", e);
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn convert_and_scale_image(
    file_path: String,
    format: String,
    scale: f32,
    _skip_recording: bool,
) -> Result<String, String> {
    use image::DynamicImage;
    use std::fs;
    use std::path::PathBuf;

    println!(
        "[convert_and_scale_image] 转换图片: {}, 格式: {}, 缩放: {}%",
        file_path,
        format,
        (scale * 100.0) as i32
    );

    // 转换为绝对路径
    let absolute_path = if file_path.starts_with("imgs/") {
        let config_dir =
            dirs::config_dir().ok_or_else(|| "Unable to get config directory".to_string())?;
        config_dir.join("clipboard-app").join(&file_path)
    } else {
        PathBuf::from(&file_path)
    };

    if !absolute_path.exists() {
        return Err(format!("File not found: {:?}", absolute_path));
    }

    // 读取原始图片
    let img_data = fs::read(&absolute_path).map_err(|e| format!("Failed to read image: {}", e))?;

    let img =
        image::load_from_memory(&img_data).map_err(|e| format!("Failed to decode image: {}", e))?;

    // 缩放图片
    let (width, height) = (img.width(), img.height());
    let new_width = ((width as f32) * scale) as u32;
    let new_height = ((height as f32) * scale) as u32;

    let scaled_img = if scale != 1.0 {
        println!(
            "[convert_and_scale_image] 缩放从 {}x{} 到 {}x{}",
            width, height, new_width, new_height
        );
        img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    // 转换格式并编码
    let mut buffer = Vec::new();
    let output_format = match format.to_lowercase().as_str() {
        "jpeg" | "jpg" => {
            // JPEG不支持透明度，需要先转换
            let rgb_img = DynamicImage::ImageRgb8(scaled_img.to_rgb8());
            rgb_img
                .write_to(
                    &mut std::io::Cursor::new(&mut buffer),
                    image::ImageFormat::Jpeg,
                )
                .map_err(|e| format!("Failed to encode JPEG: {}", e))?;
            "jpeg"
        }
        "webp" => {
            // WebP支持透明度
            scaled_img
                .write_to(
                    &mut std::io::Cursor::new(&mut buffer),
                    image::ImageFormat::WebP,
                )
                .map_err(|e| format!("Failed to encode WebP: {}", e))?;
            "webp"
        }
        _ => {
            // 默认PNG
            scaled_img
                .write_to(
                    &mut std::io::Cursor::new(&mut buffer),
                    image::ImageFormat::Png,
                )
                .map_err(|e| format!("Failed to encode PNG: {}", e))?;
            "png"
        }
    };

    println!(
        "[convert_and_scale_image] 转换完成，输出大小: {} 字节",
        buffer.len()
    );

    // 返回base64编码的图片数据
    let base64_data = general_purpose::STANDARD.encode(&buffer);
    Ok(format!(
        "data:image/{};base64,{}",
        output_format, base64_data
    ))
}

#[tauri::command]
pub async fn copy_converted_image(
    state: State<'_, AppState>,
    base64_data: String,
    _skip_recording: bool,
) -> Result<(), String> {
    println!("[copy_converted_image] 复制转换后的图片到剪贴板");

    // 解析base64数据
    let data_parts: Vec<&str> = base64_data.split(',').collect();
    if data_parts.len() != 2 {
        return Err("Invalid base64 data format".to_string());
    }

    let base64_content = data_parts[1];
    let image_data = general_purpose::STANDARD
        .decode(base64_content)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // 将图片数据写入临时文件
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("clipboard_temp_{}.png", uuid::Uuid::new_v4()));

    std::fs::write(&temp_file, &image_data)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // 暂时禁用监控以避免记录
    state.set_skip_next_clipboard_change(true).await;

    // 复制到剪贴板
    let result = state
        .copy_image_to_clipboard(temp_file.to_str().unwrap().to_string())
        .await;

    // 清理临时文件
    let _ = std::fs::remove_file(&temp_file);

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_url_content(url: String) -> Result<String, String> {
    use std::time::Duration;

    println!("[fetch_url_content] 请求获取URL内容: {}", url);

    // 创建HTTP客户端，配置超时
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // 发起HTTP请求
    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(content) => {
                        println!(
                            "[fetch_url_content] 成功获取内容，长度: {} 字符",
                            content.len()
                        );
                        Ok(content)
                    }
                    Err(e) => {
                        println!("[fetch_url_content] 读取响应内容失败: {}", e);
                        Err(format!("Failed to read response content: {}", e))
                    }
                }
            } else {
                println!("[fetch_url_content] HTTP错误状态: {}", response.status());
                Err(format!("HTTP error: {}", response.status()))
            }
        }
        Err(e) => {
            println!("[fetch_url_content] 网络请求失败: {}", e);
            Err(format!("Network request failed: {}", e))
        }
    }
}

// Configuration commands
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    state.get_config().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    state.update_config(config).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cache_statistics(state: State<'_, AppState>) -> Result<CacheStatistics, String> {
    state
        .get_cache_statistics()
        .await
        .map_err(|e| e.to_string())
}

// Global shortcut commands
#[tauri::command]
pub async fn register_global_shortcut(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    shortcut: String,
) -> Result<(), String> {
    state
        .register_global_shortcut(app_handle, shortcut)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unregister_global_shortcut(state: State<'_, AppState>) -> Result<(), String> {
    state
        .unregister_global_shortcut()
        .await
        .map_err(|e| e.to_string())
}

// Auto startup commands
#[tauri::command]
pub async fn set_auto_startup(state: State<'_, AppState>, enabled: bool) -> Result<(), String> {
    state
        .set_auto_startup(enabled)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_auto_startup_status(state: State<'_, AppState>) -> Result<bool, String> {
    state
        .get_auto_startup_status()
        .await
        .map_err(|e| e.to_string())
}

// Cache cleanup command
#[tauri::command]
pub async fn cleanup_expired_entries(state: State<'_, AppState>) -> Result<CleanupResult, String> {
    state
        .cleanup_expired_entries()
        .await
        .map_err(|e| e.to_string())
}

// App list commands
#[tauri::command]
pub async fn get_installed_applications() -> Result<Vec<InstalledApp>, String> {
    println!("[get_installed_applications] Starting to load applications...");

    match AppListManager::get_installed_applications() {
        Ok(apps) => {
            println!(
                "[get_installed_applications] Successfully loaded {} applications",
                apps.len()
            );
            Ok(apps)
        }
        Err(e) => {
            println!(
                "[get_installed_applications] Error loading applications: {}",
                e
            );
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_common_excluded_apps() -> Result<Vec<InstalledApp>, String> {
    Ok(AppListManager::get_common_excluded_apps())
}

// Shortcut validation command
#[tauri::command]
pub async fn validate_shortcut(shortcut: String) -> Result<bool, String> {
    // Basic validation for shortcut format
    if shortcut.is_empty() {
        return Ok(false);
    }

    // Check for required modifier keys (at least one)
    let has_modifier = shortcut.contains("Cmd")
        || shortcut.contains("Ctrl")
        || shortcut.contains("Alt")
        || shortcut.contains("Shift");

    if !has_modifier {
        return Ok(false);
    }

    // Check for system shortcut conflicts (basic check)
    let system_shortcuts = [
        "CmdOrCtrl+Q",   // Quit
        "CmdOrCtrl+W",   // Close window
        "CmdOrCtrl+H",   // Hide window
        "CmdOrCtrl+M",   // Minimize
        "CmdOrCtrl+Tab", // Switch apps
    ];

    if system_shortcuts.contains(&shortcut.as_str()) {
        return Ok(false);
    }

    Ok(true)
}

// Update commands
#[tauri::command]
pub async fn check_for_update(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<UpdateInfo, String> {
    println!("[check_for_update] Manual update check requested");
    
    // Update last check time in config
    let mut config = state.get_config().await.map_err(|e| e.to_string())?;
    config.last_update_check = Some(UpdateManager::get_current_timestamp());
    let _ = state.update_config(config).await;

    match UpdateManager::check_for_updates(&app_handle).await {
        Ok(Some(update_info)) => {
            println!("[check_for_update] Check completed successfully - update available");
            Ok(update_info)
        }
        Ok(None) => {
            println!("[check_for_update] Check completed successfully - no updates");
            Ok(UpdateInfo {
                version: app_handle.package_info().version.to_string(),
                notes: None,
                pub_date: None,
                available: false,
            })
        }
        Err(e) => {
            eprintln!("[check_for_update] Update check failed: {}", e);
            Err(format!("更新检查失败: {}", e))
        }
    }
}

#[tauri::command]
pub async fn install_update(app_handle: tauri::AppHandle) -> Result<(), String> {
    UpdateManager::download_and_install(&app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn should_check_for_updates(state: State<'_, AppState>) -> Result<bool, String> {
    let config = state.get_config().await.map_err(|e| e.to_string())?;

    // Check if auto-update is enabled
    if !config.auto_update {
        return Ok(false);
    }

    // Check if enough time has passed since last check
    Ok(UpdateManager::should_check_for_updates(
        config.last_update_check.as_deref(),
    ))
}

#[tauri::command]
pub async fn set_window_title(window: Window, title: String) -> Result<(), String> {
    window.set_title(&title).map_err(|e| e.to_string())
}


