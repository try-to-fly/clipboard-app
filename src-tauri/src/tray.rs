use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn create_tray_icon(app: &AppHandle) -> tauri::Result<()> {
    // 创建菜单
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit_item])?;

    let _tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("Dance - 剪贴板管理器")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu) // 设置菜单
        .show_menu_on_left_click(false) // 关键设置：防止左键显示菜单
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(handle_tray_event)
        .build(app)?;

    Ok(())
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    if event.id.0 == "quit" {
        app.exit(0);
    }
}

fn handle_tray_event(tray: &tauri::tray::TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        // 左键点击直接显示应用
        let app = tray.app_handle().clone();
        tauri::async_runtime::spawn(async move {
            show_window(&app).await;
        });
    }
    // 右键点击会自动显示菜单，无需特殊处理
}

async fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // 总是显示窗口并带到前台
        if let Err(e) = window.show() {
            log::error!("Failed to show window: {}", e);
        }
        if let Err(e) = window.unminimize() {
            log::error!("Failed to unminimize window: {}", e);
        }
        if let Err(e) = window.set_focus() {
            log::error!("Failed to focus window: {}", e);
        }
        // 确保窗口在最前面
        #[cfg(target_os = "macos")]
        {
            if let Err(e) = window.set_always_on_top(true) {
                log::error!("Failed to set always on top: {}", e);
            }
            // 立即取消always on top，只是为了确保窗口显示在前面
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            let _ = window.set_always_on_top(false);
        }
    }
}
