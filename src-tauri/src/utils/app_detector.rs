use cocoa::base::{id, nil};
use objc::{class, msg_send, sel, sel_impl};

pub fn get_active_app() -> Option<String> {
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

            let localized_name: id = msg_send![active_app, localizedName];
            if localized_name == nil {
                return None;
            }

            let c_str: *const i8 = msg_send![localized_name, UTF8String];
            if c_str.is_null() {
                return None;
            }

            match std::ffi::CStr::from_ptr(c_str).to_str() {
                Ok(app_name) => Some(app_name.to_string()),
                Err(_) => None, // 跳过无效的UTF-8字符串
            }
        }
    })
    .unwrap_or_else(|_| {
        eprintln!("获取活动应用程序时发生异常，已安全处理");
        None
    })
}
