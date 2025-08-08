use anyhow::Result;
use objc::{class, msg_send, sel, sel_impl};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub bundle_id: String,
    pub icon_path: Option<String>,
    pub is_running: bool,
}

pub struct AppListManager;

impl AppListManager {
    pub fn get_installed_applications() -> Result<Vec<InstalledApp>> {
        println!("[AppListManager] Starting to get installed applications...");
        let mut apps = Vec::new();
        
        println!("[AppListManager] Getting running applications...");
        let running_apps = Self::get_running_applications()?;
        println!("[AppListManager] Found {} running applications", running_apps.len());
        
        let running_bundle_ids: HashSet<String> = running_apps
            .iter()
            .map(|app| app.bundle_id.clone())
            .collect();

        // Add running applications first
        apps.extend(running_apps);

        // Scan Applications directories for additional apps
        let app_dirs = vec![
            PathBuf::from("/Applications"),
            dirs::home_dir()
                .map(|home| home.join("Applications"))
                .unwrap_or_default(),
        ];

        println!("[AppListManager] Scanning application directories...");
        for app_dir in &app_dirs {
            println!("[AppListManager] Scanning directory: {:?}", app_dir);
            if let Ok(entries) = std::fs::read_dir(&app_dir) {
                let mut count = 0;
                for entry in entries.flatten() {
                    match Self::parse_app_bundle(&entry.path()) {
                        Ok(Some(app)) => {
                            // Don't duplicate running apps
                            if !running_bundle_ids.contains(&app.bundle_id) {
                                apps.push(app);
                                count += 1;
                            }
                        }
                        Ok(None) => {
                            // App bundle parsing returned None, which is normal for non-app files
                        }
                        Err(e) => {
                            // Log error but continue with other apps
                            println!("Warning: Failed to parse app bundle at {:?}: {}", entry.path(), e);
                        }
                    }
                }
                println!("[AppListManager] Found {} additional apps in {:?}", count, app_dir);
            } else {
                println!("[AppListManager] Could not read directory: {:?}", app_dir);
            }
        }

        // Sort by name
        apps.sort_by(|a, b| a.name.cmp(&b.name));
        println!("[AppListManager] Total applications found: {}", apps.len());
        Ok(apps)
    }

    fn get_running_applications() -> Result<Vec<InstalledApp>> {
        let mut apps = Vec::new();

        #[cfg(target_os = "macos")]
        {
            use cocoa::base::{id, nil};
            use objc::{class, msg_send, sel, sel_impl};

            unsafe {
                let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
                let running_apps: id = msg_send![workspace, runningApplications];
                let count: usize = msg_send![running_apps, count];

                for i in 0..count {
                    let app: id = msg_send![running_apps, objectAtIndex: i];

                    // Check if it's a regular application (not daemon/agent)
                    let activation_policy: i32 = msg_send![app, activationPolicy];
                    if activation_policy != 0 {
                        // NSApplicationActivationPolicyRegular = 0
                        continue;
                    }

                    // Get app name
                    let localized_name: id = msg_send![app, localizedName];
                    let name_ptr: *const i8 = msg_send![localized_name, UTF8String];
                    let name = if !name_ptr.is_null() {
                        std::ffi::CStr::from_ptr(name_ptr)
                            .to_string_lossy()
                            .to_string()
                    } else {
                        continue;
                    };

                    // Get bundle identifier
                    let bundle_id_ns: id = msg_send![app, bundleIdentifier];
                    let bundle_id = if bundle_id_ns != nil {
                        let bundle_id_ptr: *const i8 = msg_send![bundle_id_ns, UTF8String];
                        if !bundle_id_ptr.is_null() {
                            std::ffi::CStr::from_ptr(bundle_id_ptr)
                                .to_string_lossy()
                                .to_string()
                        } else {
                            continue;
                        }
                    } else {
                        continue;
                    };

                    // Get icon (if available)
                    let icon_path = Self::get_app_icon_path(&bundle_id);

                    apps.push(InstalledApp {
                        name,
                        bundle_id,
                        icon_path,
                        is_running: true,
                    });
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Fallback for other platforms
        }

        Ok(apps)
    }

    fn parse_app_bundle(bundle_path: &PathBuf) -> Result<Option<InstalledApp>> {
        if !bundle_path.extension().map_or(false, |ext| ext == "app") {
            return Ok(None);
        }

        let info_plist_path = bundle_path.join("Contents/Info.plist");
        if !info_plist_path.exists() {
            return Ok(None);
        }

        // Read Info.plist to get bundle identifier and display name
        let plist_content = match std::fs::read_to_string(&info_plist_path) {
            Ok(content) => content,
            Err(e) => {
                // If UTF-8 reading fails, try reading as bytes and convert
                if let Ok(bytes) = std::fs::read(&info_plist_path) {
                    // Try to convert from UTF-8, replacing invalid sequences
                    String::from_utf8_lossy(&bytes).into_owned()
                } else {
                    return Err(anyhow::anyhow!("Failed to read plist file: {}", e));
                }
            }
        };

        // Simple plist parsing for bundle ID and name
        let bundle_id = match Self::extract_plist_value(&plist_content, "CFBundleIdentifier") {
            Ok(id) => id,
            Err(_) => {
                // If we can't get bundle ID, skip this app
                return Ok(None);
            }
        };
        
        let display_name = Self::extract_plist_value(&plist_content, "CFBundleDisplayName")
            .or_else(|_| Self::extract_plist_value(&plist_content, "CFBundleName"))
            .unwrap_or_else(|_| {
                bundle_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Unknown")
                    .to_string()
            });

        let icon_path = Self::get_app_icon_path(&bundle_id);

        Ok(Some(InstalledApp {
            name: display_name,
            bundle_id,
            icon_path,
            is_running: false,
        }))
    }

    fn extract_plist_value(plist_content: &str, key: &str) -> Result<String> {
        // Simple regex-based plist parsing
        use regex::Regex;

        let pattern = format!(
            r"<key>{}</key>\s*<string>([^<]+)</string>",
            regex::escape(key)
        );
        let re = Regex::new(&pattern)?;

        if let Some(captures) = re.captures(plist_content) {
            if let Some(value) = captures.get(1) {
                return Ok(value.as_str().to_string());
            }
        }

        Err(anyhow::anyhow!("Key {} not found in plist", key))
    }

    fn get_app_icon_path(bundle_id: &str) -> Option<String> {
        use crate::utils::app_icon_extractor::AppIconExtractor;
        
        if let Ok(extractor) = AppIconExtractor::new() {
            if let Ok(Some(icon_path)) = extractor.extract_and_cache_icon(bundle_id) {
                return icon_path.to_string_lossy().to_string().into();
            }
        }
        None
    }

    pub fn get_common_excluded_apps() -> Vec<InstalledApp> {
        vec![
            InstalledApp {
                name: "1Password 7 - Password Manager".to_string(),
                bundle_id: "com.1password.1password7".to_string(),
                icon_path: None,
                is_running: false,
            },
            InstalledApp {
                name: "Keychain Access".to_string(),
                bundle_id: "com.apple.keychainaccess".to_string(),
                icon_path: None,
                is_running: false,
            },
            InstalledApp {
                name: "1Password for Safari".to_string(),
                bundle_id: "com.1password.1password-safari-extension".to_string(),
                icon_path: None,
                is_running: false,
            },
            InstalledApp {
                name: "Bitwarden".to_string(),
                bundle_id: "com.bitwarden.desktop".to_string(),
                icon_path: None,
                is_running: false,
            },
            InstalledApp {
                name: "LastPass".to_string(),
                bundle_id: "com.lastpass.LastPass".to_string(),
                icon_path: None,
                is_running: false,
            },
        ]
    }
}
