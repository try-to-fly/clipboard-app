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
        let updater = app.updater_builder().build()?;
        
        match updater.check().await {
            Ok(Some(update)) => {
                let info = UpdateInfo {
                    version: update.version.clone(),
                    notes: update.body.clone(),
                    pub_date: update.date.map(|d| d.format(&Rfc3339).unwrap_or_default()),
                    available: true,
                };
                Ok(Some(info))
            }
            Ok(None) => Ok(None),
            Err(e) => {
                eprintln!("Failed to check for updates: {}", e);
                // Don't propagate the error, just return None
                Ok(None)
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