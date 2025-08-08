use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;
use time::format_description::well_known::Rfc3339;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: Option<String>,
    pub pub_date: Option<String>,
    pub available: bool,
}

pub struct UpdateManager;

impl UpdateManager {
    /// Check if we should check for updates (once per day)
    pub fn should_check_for_updates(last_check: Option<&str>) -> bool {
        if let Some(last_check_str) = last_check {
            if let Ok(last_check_time) = DateTime::parse_from_rfc3339(last_check_str) {
                let now = Utc::now();
                let duration = now.signed_duration_since(last_check_time);
                // Check if more than 24 hours have passed
                return duration.num_hours() >= 24;
            }
        }
        // If no last check or parsing failed, we should check
        true
    }

    /// Get current timestamp in ISO 8601 format
    pub fn get_current_timestamp() -> String {
        Utc::now().to_rfc3339()
    }

    /// Check for updates
    pub async fn check_for_updates(app: &AppHandle) -> Result<Option<UpdateInfo>> {
        println!("[UpdateManager] Starting update check...");
        println!("[UpdateManager] Current app version: {}", app.package_info().version);
        
        let updater = app.updater_builder().build()?;
        println!("[UpdateManager] Updater built successfully");

        match updater.check().await {
            Ok(Some(update)) => {
                println!("[UpdateManager] Update available: {}", update.version);
                println!("[UpdateManager] Update notes: {}", update.body.as_ref().unwrap_or(&"No notes".to_string()));
                println!("[UpdateManager] Update date: {:?}", update.date);
                let info = UpdateInfo {
                    version: update.version.clone(),
                    notes: update.body.clone(),
                    pub_date: update.date.map(|d| d.format(&Rfc3339).unwrap_or_default()),
                    available: true,
                };
                Ok(Some(info))
            }
            Ok(None) => {
                println!("[UpdateManager] No updates available - current version is up to date");
                println!("[UpdateManager] This could mean:");
                println!("  - Remote version is same or older than current version");
                println!("  - No release manifest found at the endpoint");
                println!("  - Current version {} is already the latest", app.package_info().version);
                Ok(None)
            }
            Err(e) => {
                eprintln!("[UpdateManager] Failed to check for updates: {}", e);
                eprintln!("[UpdateManager] Error details: {:?}", e);
                eprintln!("[UpdateManager] This could be due to:");
                eprintln!("  - Network connection issues");
                eprintln!("  - Invalid or unreachable update endpoints");
                eprintln!("  - Malformed update manifest");
                eprintln!("  - Authentication/permission issues");
                // Propagate the error to frontend for better error handling
                Err(e.into())
            }
        }
    }

    /// Download and install update
    pub async fn download_and_install(app: &AppHandle) -> Result<()> {
        let updater = app.updater_builder().build()?;

        if let Some(update) = updater.check().await? {
            // Emit progress events to frontend
            let app_handle = app.clone();

            update
                .download_and_install(
                    |chunk_length, content_length| {
                        let progress = if let Some(total) = content_length {
                            (chunk_length as f64 / total as f64 * 100.0) as u32
                        } else {
                            0
                        };

                        let _ = app_handle.emit("update-download-progress", progress);
                    },
                    || {
                        // Called before the update is applied
                        println!("Update is about to be installed");
                    },
                )
                .await?;
        }

        Ok(())
    }

    /// Manually trigger update check
    #[allow(dead_code)]
    pub async fn manual_check_and_update(app: &AppHandle) -> Result<UpdateInfo> {
        if let Some(info) = Self::check_for_updates(app).await? {
            Ok(info)
        } else {
            Ok(UpdateInfo {
                version: String::new(),
                notes: None,
                pub_date: None,
                available: false,
            })
        }
    }
}
