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