use cocoa::base::{id, nil};
use objc::{class, msg_send, sel, sel_impl};

#[derive(Debug, Clone)]
pub struct AppInfo {
    pub name: String,
    pub bundle_id: Option<String>,
}

pub fn get_active_app() -> Option<String> {
    get_active_app_info().map(|info| info.name)
}

pub fn get_active_app_info() -> Option<AppInfo> {
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
        eprintln!("获取活动应用程序时发生异常，已安全处理");
        None
    })
}
