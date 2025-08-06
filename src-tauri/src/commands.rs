use crate::models::{ClipboardEntry, Statistics, AppUsage};
use crate::state::AppState;
use anyhow::Result;
use tauri::State;

#[tauri::command]
pub async fn start_monitoring(state: State<'_, AppState>) -> Result<(), String> {
    state.start_monitoring().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_monitoring(state: State<'_, AppState>) -> Result<(), String> {
    state.stop_monitoring().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_clipboard_history(
    state: State<'_, AppState>,
    limit: Option<i32>,
    offset: Option<i32>,
    search: Option<String>,
) -> Result<Vec<ClipboardEntry>, String> {
    state.get_clipboard_history(limit, offset, search).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_favorite(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    state.toggle_favorite(id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_entry(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    state.delete_entry(id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state.clear_history().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_statistics(state: State<'_, AppState>) -> Result<Statistics, String> {
    state.get_statistics().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_to_clipboard(
    state: State<'_, AppState>,
    content: String,
) -> Result<(), String> {
    state.copy_to_clipboard(content).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_image_url(file_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::{Path, PathBuf};
    use base64::Engine;
    
    // 如果是相对路径（如 imgs/xxx.png），转换为绝对路径
    let absolute_path = if file_path.starts_with("imgs/") {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| "Unable to get config directory".to_string())?;
        config_dir.join("clipboard-app").join(&file_path)
    } else {
        PathBuf::from(&file_path)
    };
    
    if !absolute_path.exists() {
        return Err(format!("File not found: {:?}", absolute_path));
    }
    
    match fs::read(&absolute_path) {
        Ok(data) => {
            let extension = absolute_path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("png");
            
            let mime_type = match extension.to_lowercase().as_str() {
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "gif" => "image/gif",
                "webp" => "image/webp",
                _ => "image/png",
            };
            
            let base64_data = base64::engine::general_purpose::STANDARD.encode(&data);
            Ok(format!("data:{};base64,{}", mime_type, base64_data))
        }
        Err(e) => Err(format!("Failed to read file: {}", e))
    }
}