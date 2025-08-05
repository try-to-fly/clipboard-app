use cocoa::base::{id, nil};
use cocoa::foundation::NSString;
use objc::{class, msg_send, sel, sel_impl};

pub fn get_active_app() -> Option<String> {
    unsafe {
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let active_app: id = msg_send![workspace, frontmostApplication];
        
        if active_app != nil {
            let localized_name: id = msg_send![active_app, localizedName];
            
            if localized_name != nil {
                let c_str: *const i8 = msg_send![localized_name, UTF8String];
                if !c_str.is_null() {
                    return Some(
                        std::ffi::CStr::from_ptr(c_str)
                            .to_string_lossy()
                            .into_owned()
                    );
                }
            }
        }
        
        None
    }
}