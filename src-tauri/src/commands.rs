use crate::models::{ClipboardEntry, Statistics};
use crate::state::AppState;
use anyhow::Result;
use tauri::State;

#[tauri::command]
pub async fn start_monitoring(state: State<'_, AppState>) -> Result<(), String> {
    state.start_monitoring().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_monitoring(state: State<'_, AppState>) -> Result<(), String> {
    state.stop_monitoring().await.map_err(|e| e.to_string())
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
pub async fn toggle_favorite(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.toggle_favorite(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_entry(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.delete_entry(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state.clear_history().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_statistics(state: State<'_, AppState>) -> Result<Statistics, String> {
    state.get_statistics().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_to_clipboard(state: State<'_, AppState>, content: String) -> Result<(), String> {
    state
        .copy_to_clipboard(content)
        .await
        .map_err(|e| e.to_string())
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

    println!("[get_image_url] 请求加载图片: {}", file_path);

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

    println!("[get_image_url] 绝对路径: {:?}", absolute_path);

    if !absolute_path.exists() {
        println!("[get_image_url] 文件不存在: {:?}", absolute_path);
        // 列出 imgs 目录中的文件帮助调试
        if let Some(parent) = absolute_path.parent() {
            if parent.exists() {
                println!("[get_image_url] 目录 {:?} 中的文件:", parent);
                if let Ok(entries) = fs::read_dir(parent) {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            println!("  - {:?}", entry.file_name());
                        }
                    }
                }
            }
        }
        return Err(format!("File not found: {:?}", absolute_path));
    }

    match fs::read(&absolute_path) {
        Ok(data) => {
            println!("[get_image_url] 成功读取文件，大小: {} 字节", data.len());

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

            println!("[get_image_url] MIME 类型: {}", mime_type);

            let base64_data = base64::engine::general_purpose::STANDARD.encode(&data);
            Ok(format!("data:{};base64,{}", mime_type, base64_data))
        }
        Err(e) => {
            println!("[get_image_url] 读取文件失败: {}", e);
            Err(format!("Failed to read file: {}", e))
        }
    }
}
