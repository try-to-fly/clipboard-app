mod clipboard;
mod commands;
mod database;
mod models;
mod state;
mod utils;

use state::AppState;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let runtime = tokio::runtime::Runtime::new().unwrap();
            let state = runtime.block_on(AppState::new())?;
            
            let app_handle = app.handle();
            state.set_app_handle(app_handle.clone());
            
            app.manage(state);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_monitoring,
            stop_monitoring,
            get_clipboard_history,
            toggle_favorite,
            delete_entry,
            clear_history,
            get_statistics,
            copy_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
