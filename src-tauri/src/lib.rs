#![allow(unexpected_cfgs)]

mod clipboard;
mod commands;
mod database;
mod models;
mod state;
mod utils;

use commands::*;
use state::AppState;
use tauri::{Manager, Emitter, menu::{Menu, MenuItem, PredefinedMenuItem, Submenu}, AppHandle};

async fn handle_menu_event(app_handle: &AppHandle, event_id: &str) {
    println!("Menu event: {}", event_id);
    
    let state = app_handle.state::<AppState>();
    
    match event_id {
        "clear_history" => {
            if let Err(e) = state.clear_history().await {
                eprintln!("Failed to clear history: {}", e);
            } else {
                // Emit event to refresh frontend
                let _ = app_handle.emit("history_cleared", ());
            }
        }
        "show_statistics" => {
            match state.get_statistics().await {
                Ok(stats) => {
                    if let Err(e) = app_handle.emit("show_statistics", &stats) {
                        eprintln!("Failed to emit statistics event: {}", e);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to get statistics: {}", e);
                }
            }
        }
        "toggle_monitoring" => {
            let is_monitoring = state.is_monitoring().await;
            let result = if is_monitoring {
                state.stop_monitoring().await
            } else {
                state.start_monitoring().await
            };
            
            if let Err(e) = result {
                eprintln!("Failed to toggle monitoring: {}", e);
            } else {
                // Emit event to update menu label
                let new_is_monitoring = state.is_monitoring().await;
                if let Err(e) = app_handle.emit("monitoring_toggled", new_is_monitoring) {
                    eprintln!("Failed to emit monitoring toggle event: {}", e);
                }
            }
        }
        _ => {
            println!("Unknown menu event: {}", event_id);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Create macOS menu
            #[cfg(target_os = "macos")]
            {
                let app_name_submenu = Submenu::with_items(
                    app,
                    "剪切板管理器",
                    true,
                    &[
                        &PredefinedMenuItem::about(app, Some("关于剪切板管理器"), None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::hide(app, Some("隐藏剪切板管理器"))?,
                        &PredefinedMenuItem::hide_others(app, Some("隐藏其他"))?,
                        &PredefinedMenuItem::show_all(app, Some("显示全部"))?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::quit(app, Some("退出剪切板管理器"))?,
                    ],
                )?;

                let edit_submenu = Submenu::with_items(
                    app,
                    "编辑",
                    true,
                    &[
                        &MenuItem::with_id(app, "clear_history", "清空历史", true, Some("CmdOrCtrl+Shift+Delete"))?,
                    ],
                )?;

                let view_submenu = Submenu::with_items(
                    app,
                    "查看",
                    true,
                    &[
                        &MenuItem::with_id(app, "show_statistics", "查看统计", true, Some("CmdOrCtrl+I"))?,
                    ],
                )?;

                let control_submenu = Submenu::with_items(
                    app,
                    "控制",
                    true,
                    &[
                        &MenuItem::with_id(app, "toggle_monitoring", "开始监听", true, Some("CmdOrCtrl+Space"))?,
                    ],
                )?;

                let menu = Menu::with_items(
                    app,
                    &[
                        &app_name_submenu,
                        &edit_submenu,
                        &view_submenu,
                        &control_submenu,
                    ],
                )?;

                app.set_menu(menu)?;
            }

            tauri::async_runtime::block_on(async {
                let state = AppState::new().await?;

                let app_handle = app.handle().clone();
                state.set_app_handle(app_handle);

                app.manage(state);

                Ok::<(), Box<dyn std::error::Error>>(())
            })?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let app_handle = app.clone();
            let event_id = event.id.0.clone();
            tauri::async_runtime::spawn(async move {
                handle_menu_event(&app_handle, &event_id).await;
            });
        })
        .invoke_handler(tauri::generate_handler![
            start_monitoring,
            stop_monitoring,
            get_clipboard_history,
            toggle_favorite,
            delete_entry,
            clear_history,
            get_statistics,
            copy_to_clipboard,
            paste_text,
            paste_image,
            get_image_url,
            open_file_with_system,
            get_app_icon,
            convert_and_scale_image,
            copy_converted_image,
            fetch_url_content
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
