#![allow(unexpected_cfgs)]

mod clipboard;
mod commands;
mod config;
mod database;
mod models;
mod state;
mod updater;
mod utils;

use commands::*;
use state::AppState;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager,
};

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
        "show_statistics" => match state.get_statistics().await {
            Ok(stats) => {
                if let Err(e) = app_handle.emit("show_statistics", &stats) {
                    eprintln!("Failed to emit statistics event: {}", e);
                }
            }
            Err(e) => {
                eprintln!("Failed to get statistics: {}", e);
            }
        },
        "show_preferences" => {
            if let Err(e) = app_handle.emit("show_preferences", ()) {
                eprintln!("Failed to emit preferences event: {}", e);
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    println!("Global shortcut triggered: {:?}", shortcut);
                    
                    // Show/focus the main window when global shortcut is pressed
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                    
                    // Also emit event to frontend
                    let _ = app.emit("global-shortcut", shortcut);
                })
                .build()
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
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
                        &MenuItem::with_id(
                            app,
                            "show_preferences",
                            "偏好设置...",
                            true,
                            Some("CmdOrCtrl+,"),
                        )?,
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
                    &[&MenuItem::with_id(
                        app,
                        "clear_history",
                        "清空历史",
                        true,
                        Some("CmdOrCtrl+Shift+Delete"),
                    )?],
                )?;

                let view_submenu = Submenu::with_items(
                    app,
                    "查看",
                    true,
                    &[&MenuItem::with_id(
                        app,
                        "show_statistics",
                        "查看统计",
                        true,
                        Some("CmdOrCtrl+I"),
                    )?],
                )?;

                let control_submenu = Submenu::with_items(
                    app,
                    "控制",
                    true,
                    &[&MenuItem::with_id(
                        app,
                        "toggle_monitoring",
                        "开始监听",
                        true,
                        Some("CmdOrCtrl+Space"),
                    )?],
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
                state.set_app_handle(app_handle.clone());

                // Load config and register global shortcut on startup
                if let Ok(config) = state.get_config().await {
                    if !config.global_shortcut.is_empty() {
                        if let Err(e) = state.register_global_shortcut(app_handle.clone(), config.global_shortcut.clone()).await {
                            eprintln!("Failed to register global shortcut on startup: {}", e);
                        } else {
                            println!("Global shortcut registered on startup: {}", config.global_shortcut);
                        }
                    }
                }

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
            fetch_url_content,
            get_config,
            update_config,
            get_cache_statistics,
            register_global_shortcut,
            unregister_global_shortcut,
            set_auto_startup,
            get_auto_startup_status,
            cleanup_expired_entries,
            get_installed_applications,
            get_common_excluded_apps,
            validate_shortcut,
            check_for_update,
            install_update,
            should_check_for_updates
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
