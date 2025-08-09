use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};

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
        log::debug!("[AppListManager] Starting to get installed applications...");
        let mut apps = Vec::new();

        log::debug!("[AppListManager] Getting running applications...");
        let running_apps = Self::get_running_applications()?;
        log::debug!(
            "[AppListManager] Found {} running applications",
            running_apps.len()
        );

        let running_bundle_ids: HashSet<String> = running_apps
            .iter()
            .map(|app| app.bundle_id.clone())
            .collect();

        // Add running applications first
        apps.extend(running_apps);

        // Scan system directories for additional apps
        let additional_apps = Self::scan_installed_apps(&running_bundle_ids);
        apps.extend(additional_apps);

        // Sort by name
        apps.sort_by(|a, b| a.name.cmp(&b.name));
        log::info!("[AppListManager] Total applications found: {}", apps.len());
        Ok(apps)
    }

    fn get_running_applications() -> Result<Vec<InstalledApp>> {
        #[cfg(target_os = "macos")]
        {
            Self::get_running_applications_macos()
        }

        #[cfg(target_os = "windows")]
        {
            Self::get_running_applications_windows()
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            Ok(Vec::new())
        }
    }

    #[cfg(target_os = "macos")]
    fn get_running_applications_macos() -> Result<Vec<InstalledApp>> {
        use cocoa::base::{id, nil};
        use objc::{class, msg_send, sel, sel_impl};

        let mut apps = Vec::new();

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

        Ok(apps)
    }

    fn scan_installed_apps(running_bundle_ids: &HashSet<String>) -> Vec<InstalledApp> {
        #[cfg(target_os = "macos")]
        {
            Self::scan_installed_apps_macos(running_bundle_ids)
        }

        #[cfg(target_os = "windows")]
        {
            Self::scan_installed_apps_windows(running_bundle_ids)
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            Vec::new()
        }
    }

    #[cfg(target_os = "macos")]
    fn scan_installed_apps_macos(running_bundle_ids: &HashSet<String>) -> Vec<InstalledApp> {
        let mut apps = Vec::new();

        let app_dirs = vec![
            PathBuf::from("/Applications"),
            dirs::home_dir()
                .map(|home| home.join("Applications"))
                .unwrap_or_default(),
        ];

        log::debug!("[AppListManager] Scanning application directories...");
        for app_dir in &app_dirs {
            log::debug!("[AppListManager] Scanning directory: {:?}", app_dir);
            if let Ok(entries) = std::fs::read_dir(app_dir) {
                let mut count = 0;
                for entry in entries.flatten() {
                    match Self::parse_app_bundle_macos(&entry.path()) {
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
                            log::warn!(
                                "Warning: Failed to parse app bundle at {:?}: {}",
                                entry.path(),
                                e
                            );
                        }
                    }
                }
                log::debug!(
                    "[AppListManager] Found {} additional apps in {:?}",
                    count,
                    app_dir
                );
            } else {
                log::warn!("[AppListManager] Could not read directory: {:?}", app_dir);
            }
        }

        apps
    }

    #[cfg(target_os = "windows")]
    fn scan_installed_apps_windows(running_bundle_ids: &HashSet<String>) -> Vec<InstalledApp> {
        let mut apps = Vec::new();

        // Common Windows application directories
        let app_dirs = vec![
            PathBuf::from("C:\\Program Files"),
            PathBuf::from("C:\\Program Files (x86)"),
            dirs::home_dir()
                .map(|home| home.join("AppData\\Local\\Programs"))
                .unwrap_or_default(),
        ];

        log::debug!("[AppListManager] Scanning Windows application directories...");
        for app_dir in &app_dirs {
            log::debug!("[AppListManager] Scanning directory: {:?}", app_dir);
            if let Ok(entries) = std::fs::read_dir(app_dir) {
                let mut count = 0;
                for entry in entries.flatten() {
                    if let Ok(app_folder_entries) = std::fs::read_dir(entry.path()) {
                        for app_entry in app_folder_entries.flatten() {
                            if let Some(extension) = app_entry.path().extension() {
                                if extension == "exe" {
                                    match Self::parse_executable_windows(&app_entry.path()) {
                                        Ok(Some(app)) => {
                                            // Don't duplicate running apps
                                            if !running_bundle_ids.contains(&app.bundle_id) {
                                                apps.push(app);
                                                count += 1;
                                            }
                                        }
                                        Ok(None) => {}
                                        Err(e) => {
                                            log::warn!(
                                                "Warning: Failed to parse executable at {:?}: {}",
                                                app_entry.path(),
                                                e
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                log::debug!(
                    "[AppListManager] Found {} additional apps in {:?}",
                    count,
                    app_dir
                );
            } else {
                log::warn!("[AppListManager] Could not read directory: {:?}", app_dir);
            }
        }

        apps
    }

    #[cfg(target_os = "windows")]
    fn get_running_applications_windows() -> Result<Vec<InstalledApp>> {
        use std::collections::HashMap;
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use winapi::shared::minwindef::{DWORD, FALSE, MAX_PATH};
        use winapi::um::handleapi::CloseHandle;
        use winapi::um::processthreadsapi::OpenProcess;
        use winapi::um::psapi::GetProcessImageFileNameW;
        use winapi::um::psapi::{EnumProcesses, GetModuleBaseNameW};
        use winapi::um::winnt::{PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};

        let mut apps = Vec::new();
        let mut process_map = HashMap::new();

        unsafe {
            let mut processes = [0u32; 1024];
            let mut bytes_returned = 0u32;

            if EnumProcesses(
                processes.as_mut_ptr(),
                (processes.len() * std::mem::size_of::<u32>()) as u32,
                &mut bytes_returned,
            ) == 0
            {
                return Ok(apps);
            }

            let process_count = bytes_returned as usize / std::mem::size_of::<u32>();

            for &process_id in &processes[..process_count] {
                if process_id == 0 {
                    continue;
                }

                let process_handle = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                    FALSE,
                    process_id,
                );

                if process_handle.is_null() {
                    continue;
                }

                // Get process name
                let mut process_name = [0u16; MAX_PATH];
                let name_len = GetModuleBaseNameW(
                    process_handle,
                    std::ptr::null_mut(),
                    process_name.as_mut_ptr(),
                    MAX_PATH as DWORD,
                );

                if name_len > 0 {
                    let name_slice = &process_name[..name_len as usize];
                    let name = OsString::from_wide(name_slice)
                        .to_string_lossy()
                        .to_string();

                    // Get executable path
                    let mut exe_path = [0u16; MAX_PATH];
                    let path_len = GetProcessImageFileNameW(
                        process_handle,
                        exe_path.as_mut_ptr(),
                        MAX_PATH as DWORD,
                    );

                    let bundle_id = if path_len > 0 {
                        let path_slice = &exe_path[..path_len as usize];
                        let path_string = OsString::from_wide(path_slice)
                            .to_string_lossy()
                            .to_string();

                        if let Some(filename) = std::path::Path::new(&path_string).file_stem() {
                            filename.to_string_lossy().to_string()
                        } else {
                            name.clone()
                        }
                    } else {
                        name.clone()
                    };

                    // Avoid duplicates based on bundle_id
                    if !process_map.contains_key(&bundle_id) {
                        // Remove .exe extension from display name
                        let display_name = if name.ends_with(".exe") {
                            name.trim_end_matches(".exe").to_string()
                        } else {
                            name
                        };

                        let icon_path = Self::get_app_icon_path(&bundle_id);

                        process_map.insert(bundle_id.clone(), ());
                        apps.push(InstalledApp {
                            name: display_name,
                            bundle_id,
                            icon_path,
                            is_running: true,
                        });
                    }
                }

                CloseHandle(process_handle);
            }
        }

        Ok(apps)
    }

    #[cfg(target_os = "macos")]
    fn parse_app_bundle_macos(bundle_path: &Path) -> Result<Option<InstalledApp>> {
        if bundle_path.extension().is_none_or(|ext| ext != "app") {
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

    #[cfg(target_os = "windows")]
    fn parse_executable_windows(exe_path: &PathBuf) -> Result<Option<InstalledApp>> {
        if !exe_path.extension().map_or(false, |ext| ext == "exe") {
            return Ok(None);
        }

        // Skip system executables and common non-application files
        let filename = exe_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");

        // Skip common system files
        let system_files = [
            "unins", "setup", "install", "update", "launcher", "helper", "service", "daemon",
            "crash", "error",
        ];

        if system_files
            .iter()
            .any(|&sys| filename.to_lowercase().contains(sys))
        {
            return Ok(None);
        }

        let display_name = filename.to_string();
        let bundle_id = filename.to_lowercase();
        let icon_path = Self::get_app_icon_path(&bundle_id);

        Ok(Some(InstalledApp {
            name: display_name,
            bundle_id,
            icon_path,
            is_running: false,
        }))
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
