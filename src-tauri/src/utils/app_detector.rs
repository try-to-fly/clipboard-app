#[derive(Debug, Clone)]
pub struct AppInfo {
    pub name: String,
    pub bundle_id: Option<String>,
}

#[allow(dead_code)]
pub fn get_active_app() -> Option<String> {
    get_active_app_info().map(|info| info.name)
}

pub fn get_active_app_info() -> Option<AppInfo> {
    #[cfg(target_os = "macos")]
    {
        get_active_app_info_macos()
    }

    #[cfg(target_os = "windows")]
    {
        get_active_app_info_windows()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

#[cfg(target_os = "macos")]
fn get_active_app_info_macos() -> Option<AppInfo> {
    use cocoa::base::{id, nil};
    use objc::{class, msg_send, sel, sel_impl};

    // 使用 std::panic::catch_unwind 来捕获可能的外部异常
    std::panic::catch_unwind(|| {
        unsafe {
            let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
            if workspace == nil {
                return None;
            }

            let active_app: id = msg_send![workspace, frontmostApplication];
            if active_app == nil {
                return None;
            }

            // 获取应用名称
            let localized_name: id = msg_send![active_app, localizedName];
            if localized_name == nil {
                return None;
            }

            let name_c_str: *const i8 = msg_send![localized_name, UTF8String];
            if name_c_str.is_null() {
                return None;
            }

            let app_name = match std::ffi::CStr::from_ptr(name_c_str).to_str() {
                Ok(name) => name.to_string(),
                Err(_) => return None, // 跳过无效的UTF-8字符串
            };

            // 获取Bundle ID
            let bundle_id_obj: id = msg_send![active_app, bundleIdentifier];
            let bundle_id = if bundle_id_obj != nil {
                let bundle_id_c_str: *const i8 = msg_send![bundle_id_obj, UTF8String];
                if !bundle_id_c_str.is_null() {
                    match std::ffi::CStr::from_ptr(bundle_id_c_str).to_str() {
                        Ok(id) => Some(id.to_string()),
                        Err(_) => None,
                    }
                } else {
                    None
                }
            } else {
                None
            };

            Some(AppInfo {
                name: app_name,
                bundle_id,
            })
        }
    })
    .unwrap_or_else(|_| {
        log::error!("获取活动应用程序时发生异常，已安全处理");
        None
    })
}

#[cfg(target_os = "windows")]
fn get_active_app_info_windows() -> Option<AppInfo> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use winapi::shared::minwindef::{DWORD, FALSE, MAX_PATH};
    use winapi::shared::windef::HWND;
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::processthreadsapi::OpenProcess;
    use winapi::um::psapi::GetProcessImageFileNameW;
    use winapi::um::winnt::{PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
    use winapi::um::winuser::GetWindowThreadProcessId;
    use winapi::um::winuser::{GetForegroundWindow, GetWindowTextW};

    unsafe {
        // 获取前台窗口句柄
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }

        // 获取窗口标题
        let mut window_title = [0u16; 256];
        let title_len = GetWindowTextW(hwnd, window_title.as_mut_ptr(), 256);

        let app_name = if title_len > 0 {
            let title_slice = &window_title[..title_len as usize];
            OsString::from_wide(title_slice)
                .to_string_lossy()
                .to_string()
        } else {
            "Unknown".to_string()
        };

        // 获取进程ID
        let mut process_id: DWORD = 0;
        GetWindowThreadProcessId(hwnd, &mut process_id);

        if process_id == 0 {
            return Some(AppInfo {
                name: app_name,
                bundle_id: None,
            });
        }

        // 打开进程句柄
        let process_handle = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            FALSE,
            process_id,
        );

        if process_handle.is_null() {
            return Some(AppInfo {
                name: app_name,
                bundle_id: None,
            });
        }

        // 获取进程可执行文件路径
        let mut exe_path = [0u16; MAX_PATH];
        let path_len =
            GetProcessImageFileNameW(process_handle, exe_path.as_mut_ptr(), MAX_PATH as DWORD);

        CloseHandle(process_handle);

        let bundle_id = if path_len > 0 {
            let path_slice = &exe_path[..path_len as usize];
            let path_string = OsString::from_wide(path_slice)
                .to_string_lossy()
                .to_string();

            // 从路径中提取可执行文件名作为bundle_id
            if let Some(filename) = std::path::Path::new(&path_string).file_stem() {
                Some(filename.to_string_lossy().to_string())
            } else {
                None
            }
        } else {
            None
        };

        Some(AppInfo {
            name: app_name,
            bundle_id,
        })
    }
}
