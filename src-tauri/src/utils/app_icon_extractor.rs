use anyhow::Result;
use cocoa::base::{id, nil};
use cocoa::foundation::{NSData, NSString};
use objc::{class, msg_send, sel, sel_impl};
use std::fs;
use std::path::{Path, PathBuf};

pub struct AppIconExtractor {
    icons_dir: PathBuf,
}

impl AppIconExtractor {
    pub fn new() -> Result<Self> {
        let config_dir =
            dirs::config_dir().ok_or_else(|| anyhow::anyhow!("Unable to get config directory"))?;
        let icons_dir = config_dir.join("clipboard-app").join("icons");

        // 确保图标目录存在
        if !icons_dir.exists() {
            fs::create_dir_all(&icons_dir)?;
        }

        Ok(Self { icons_dir })
    }

    /// 提取应用图标并保存到本地缓存
    pub fn extract_and_cache_icon(&self, bundle_id: &str) -> Result<Option<PathBuf>> {
        let icon_path = self.icons_dir.join(format!("{}.png", bundle_id));

        // 如果图标已经缓存，直接返回路径
        if icon_path.exists() {
            return Ok(Some(icon_path));
        }

        // 使用NSWorkspace获取应用图标
        let icon_data = self.extract_icon_data(bundle_id)?;

        if let Some(data) = icon_data {
            // 保存图标到文件
            fs::write(&icon_path, data)?;
            return Ok(Some(icon_path));
        }

        Ok(None)
    }

    /// 使用macOS NSWorkspace API提取图标数据
    fn extract_icon_data(&self, bundle_id: &str) -> Result<Option<Vec<u8>>> {
        std::panic::catch_unwind(|| {
            unsafe {
                // 获取NSWorkspace实例
                let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
                if workspace == nil {
                    return None;
                }

                // 创建NSString用于Bundle ID
                let bundle_id_nsstring = NSString::alloc(nil).init_str(bundle_id);

                // 通过Bundle ID获取应用路径
                let app_path: id = msg_send![
                    workspace,
                    absolutePathForAppBundleWithIdentifier: bundle_id_nsstring
                ];

                if app_path == nil {
                    return None;
                }

                // 获取应用图标
                let icon: id = msg_send![workspace, iconForFile: app_path];
                if icon == nil {
                    return None;
                }

                // 设置图标大小（128x128 适合显示）
                let size = cocoa::foundation::NSSize {
                    width: 128.0,
                    height: 128.0,
                };
                let _: () = msg_send![icon, setSize: size];

                // 获取TIFF数据
                let tiff_data: id = msg_send![icon, TIFFRepresentation];
                if tiff_data == nil {
                    return None;
                }

                // 转换为NSBitmapImageRep
                let image_rep: id = msg_send![
                    class!(NSBitmapImageRep),
                    imageRepWithData: tiff_data
                ];

                if image_rep == nil {
                    return None;
                }

                // 转换为PNG数据
                let png_data: id = msg_send![
                    image_rep,
                    representationUsingType: 4 // NSBitmapImageFileTypePNG
                    properties: nil
                ];

                if png_data == nil {
                    return None;
                }

                // 获取数据长度和指针
                let length: usize = msg_send![png_data, length];
                let bytes_ptr: *const u8 = msg_send![png_data, bytes];

                if bytes_ptr.is_null() || length == 0 {
                    return None;
                }

                // 复制数据到Vector
                let data = std::slice::from_raw_parts(bytes_ptr, length).to_vec();
                Some(data)
            }
        })
        .unwrap_or_else(|_| {
            eprintln!("提取应用图标时发生异常：{}", bundle_id);
            None
        })
        .ok_or_else(|| anyhow::anyhow!("Failed to extract icon data"))
        .map(Some)
        .or_else(|_| Ok(None))
    }

    /// 获取缓存的图标路径
    pub fn get_cached_icon_path(&self, bundle_id: &str) -> Option<PathBuf> {
        let icon_path = self.icons_dir.join(format!("{}.png", bundle_id));
        if icon_path.exists() {
            Some(icon_path)
        } else {
            None
        }
    }

    /// 清理过期的图标缓存（超过30天的文件）
    pub fn cleanup_old_icons(&self) -> Result<()> {
        let now = std::time::SystemTime::now();
        let thirty_days = std::time::Duration::from_secs(30 * 24 * 60 * 60);

        if let Ok(entries) = fs::read_dir(&self.icons_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            if let Ok(age) = now.duration_since(modified) {
                                if age > thirty_days {
                                    let _ = fs::remove_file(entry.path());
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }
}
