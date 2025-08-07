use crate::clipboard::{ClipboardMonitor, ContentProcessor};
use crate::commands::{CacheStatistics, CleanupResult};
use crate::config::{AppConfig, ConfigManager};
use crate::database::Database;
use crate::models::{AppUsage, ClipboardEntry, Statistics};
use anyhow::Result;
use arboard::Clipboard;
use chrono::Utc;
use sqlx::Row;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tokio::sync::Mutex;
use tokio::sync::{broadcast, RwLock};

pub struct AppState {
    pub db: Arc<Database>,
    pub monitor: Arc<RwLock<Option<ClipboardMonitor>>>,
    pub tx: broadcast::Sender<ClipboardEntry>,
    pub _rx: Arc<Mutex<broadcast::Receiver<ClipboardEntry>>>,
    pub app_handle: Arc<Mutex<Option<AppHandle>>>,
    pub processor: Arc<ContentProcessor>,
    pub skip_next_change: Arc<Mutex<bool>>,
    pub config_manager: Arc<Mutex<ConfigManager>>,
    pub current_shortcut: Arc<Mutex<Option<String>>>,
    pub last_cleanup_date: Arc<Mutex<Option<chrono::DateTime<Utc>>>>,
}

impl AppState {
    pub async fn new() -> Result<Self> {
        let db = Arc::new(Database::new().await?);
        let (tx, rx) = broadcast::channel(100);
        let processor = Arc::new(ContentProcessor::new()?);
        let config_manager = Arc::new(Mutex::new(ConfigManager::new().await?));

        let instance = Self {
            db,
            monitor: Arc::new(RwLock::new(None)),
            tx: tx.clone(),
            _rx: Arc::new(Mutex::new(rx)),
            app_handle: Arc::new(Mutex::new(None)),
            processor,
            skip_next_change: Arc::new(Mutex::new(false)),
            config_manager,
            current_shortcut: Arc::new(Mutex::new(None)),
            last_cleanup_date: Arc::new(Mutex::new(None)),
        };

        // 初始化清理日期
        instance.check_and_cleanup_daily().await?;

        Ok(instance)
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        let app_handle = Arc::clone(&self.app_handle);
        tauri::async_runtime::spawn(async move {
            let mut guard = app_handle.lock().await;
            *guard = Some(handle);
        });
    }

    pub async fn start_monitoring(&self) -> Result<()> {
        let mut monitor_guard = self.monitor.write().await;

        if monitor_guard.is_none() {
            let monitor = ClipboardMonitor::new(
                self.tx.clone(),
                Arc::clone(&self.processor),
                Arc::clone(&self.config_manager),
            )?;
            monitor.start_monitoring().await;
            *monitor_guard = Some(monitor);

            // 启动数据库保存任务
            self.start_database_save_task().await;
        }

        Ok(())
    }

    pub async fn stop_monitoring(&self) -> Result<()> {
        let mut monitor_guard = self.monitor.write().await;
        *monitor_guard = None;
        Ok(())
    }

    pub async fn is_monitoring(&self) -> bool {
        let monitor_guard = self.monitor.read().await;
        monitor_guard.is_some()
    }

    async fn start_database_save_task(&self) {
        let db = Arc::clone(&self.db);
        let mut rx = self.tx.subscribe();
        let app_handle = Arc::clone(&self.app_handle);

        tokio::spawn(async move {
            while let Ok(entry) = rx.recv().await {
                // 检查是否已存在相同内容
                let existing = sqlx::query(
                    "SELECT id, copy_count FROM clipboard_entries WHERE content_hash = ?",
                )
                .bind(&entry.content_hash)
                .fetch_optional(db.pool())
                .await;

                let mut updated_entry = entry.clone();

                match existing {
                    Ok(Some(row)) => {
                        // 更新复制次数
                        let id: String = row.get("id");
                        let count: i32 = row.get("copy_count");
                        let new_count = count + 1;

                        let _ = sqlx::query(
                            "UPDATE clipboard_entries SET copy_count = ?, created_at = ? WHERE id = ?"
                        )
                        .bind(new_count)
                        .bind(entry.created_at)
                        .bind(&id)
                        .execute(db.pool())
                        .await;

                        // 更新条目信息以便发送正确的数据到前端
                        updated_entry.id = id;
                        updated_entry.copy_count = new_count;
                    }
                    Ok(None) => {
                        // 插入新记录 - 新记录的copy_count应该是1
                        updated_entry.copy_count = 1;

                        let _ = sqlx::query(
                            r#"
                            INSERT INTO clipboard_entries 
                            (id, content_hash, content_type, content_data, source_app, 
                             created_at, copy_count, file_path, is_favorite, content_subtype, metadata, app_bundle_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            "#,
                        )
                        .bind(&entry.id)
                        .bind(&entry.content_hash)
                        .bind(&entry.content_type)
                        .bind(&entry.content_data)
                        .bind(&entry.source_app)
                        .bind(entry.created_at)
                        .bind(1) // 新记录的copy_count设为1
                        .bind(&entry.file_path)
                        .bind(entry.is_favorite as i32)
                        .bind(&entry.content_subtype)
                        .bind(&entry.metadata)
                        .bind(&entry.app_bundle_id)
                        .execute(db.pool())
                        .await;
                    }
                    Err(e) => eprintln!("数据库查询错误: {}", e),
                }

                // 发送更新后的条目到前端
                if let Some(handle) = app_handle.lock().await.as_ref() {
                    let _ = handle.emit("clipboard-update", &updated_entry);
                }
            }
        });
    }

    pub async fn get_clipboard_history(
        &self,
        limit: Option<i32>,
        offset: Option<i32>,
        search: Option<String>,
    ) -> Result<Vec<ClipboardEntry>> {
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let query = if let Some(search_term) = search {
            sqlx::query_as::<_, ClipboardEntry>(
                r#"
                SELECT * FROM clipboard_entries 
                WHERE content_data LIKE ? OR source_app LIKE ?
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
                "#,
            )
            .bind(format!("%{}%", search_term))
            .bind(format!("%{}%", search_term))
            .bind(limit)
            .bind(offset)
        } else {
            sqlx::query_as::<_, ClipboardEntry>(
                "SELECT * FROM clipboard_entries ORDER BY created_at DESC LIMIT ? OFFSET ?",
            )
            .bind(limit)
            .bind(offset)
        };

        let entries = query.fetch_all(self.db.pool()).await?;
        Ok(entries)
    }

    pub async fn toggle_favorite(&self, id: String) -> Result<()> {
        sqlx::query("UPDATE clipboard_entries SET is_favorite = NOT is_favorite WHERE id = ?")
            .bind(&id)
            .execute(self.db.pool())
            .await?;

        Ok(())
    }

    pub async fn delete_entry(&self, id: String) -> Result<()> {
        sqlx::query("DELETE FROM clipboard_entries WHERE id = ?")
            .bind(&id)
            .execute(self.db.pool())
            .await?;

        Ok(())
    }

    pub async fn clear_history(&self) -> Result<()> {
        sqlx::query("DELETE FROM clipboard_entries")
            .execute(self.db.pool())
            .await?;

        Ok(())
    }

    pub async fn get_statistics(&self) -> Result<Statistics> {
        // 总条目数
        let total_entries: i64 = sqlx::query("SELECT COUNT(*) as count FROM clipboard_entries")
            .fetch_one(self.db.pool())
            .await?
            .get("count");

        // 总复制次数
        let total_copies: i64 = sqlx::query("SELECT SUM(copy_count) as sum FROM clipboard_entries")
            .fetch_one(self.db.pool())
            .await?
            .try_get("sum")
            .unwrap_or(0);

        // 最多复制的条目
        let most_copied = sqlx::query_as::<_, ClipboardEntry>(
            "SELECT * FROM clipboard_entries ORDER BY copy_count DESC LIMIT 10",
        )
        .fetch_all(self.db.pool())
        .await?;

        // 最近使用的应用
        let recent_apps = sqlx::query(
            r#"
            SELECT source_app, COUNT(*) as count 
            FROM clipboard_entries 
            WHERE source_app IS NOT NULL 
            GROUP BY source_app 
            ORDER BY count DESC 
            LIMIT 10
            "#,
        )
        .fetch_all(self.db.pool())
        .await?
        .into_iter()
        .map(|row| AppUsage {
            app_name: row.get("source_app"),
            count: row.get("count"),
        })
        .collect();

        Ok(Statistics {
            total_entries,
            total_copies,
            most_copied,
            recent_apps,
        })
    }

    pub async fn copy_to_clipboard(&self, content: String) -> Result<()> {
        tokio::task::spawn_blocking(move || -> Result<()> {
            let mut clipboard = Clipboard::new()?;
            clipboard.set_text(content)?;
            Ok(())
        })
        .await??;
        Ok(())
    }

    pub async fn copy_image_to_clipboard(&self, file_path: String) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;

            tokio::task::spawn_blocking(move || -> Result<()> {
                // 使用osascript复制图片到剪贴板
                let script = format!(
                    r#"
                    set the clipboard to (read (POSIX file "{}") as «class PNGf»)
                    "#,
                    file_path
                );

                let output = Command::new("osascript").arg("-e").arg(&script).output()?;

                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    return Err(anyhow::anyhow!("Failed to copy image: {}", stderr));
                }

                Ok(())
            })
            .await??;
        }

        #[cfg(not(target_os = "macos"))]
        {
            return Err(anyhow::anyhow!("Image copy only supported on macOS"));
        }

        Ok(())
    }

    pub async fn set_skip_next_clipboard_change(&self, skip: bool) {
        let mut skip_guard = self.skip_next_change.lock().await;
        *skip_guard = skip;
    }

    pub async fn paste_text(
        &self,
        content: String,
        app_handle: Option<tauri::AppHandle>,
    ) -> Result<()> {
        tokio::task::spawn_blocking(move || -> Result<()> {
            let mut clipboard = Clipboard::new()?;
            clipboard.set_text(content)?;
            Ok(())
        })
        .await??;

        // 切换应用焦点并粘贴（macOS）
        #[cfg(target_os = "macos")]
        {
            tokio::task::spawn_blocking(move || -> Result<()> {
                use std::process::Command;

                println!("[paste_text] 开始执行粘贴流程");

                // 隐藏clipboard-app窗口，让下层应用自动获得焦点
                let hide_and_paste_script = r#"
                    tell application "System Events"
                        -- 隐藏clipboard-app窗口（不是最小化）
                        set visible of process "clipboard-app" to false
                        
                        -- 等待一小段时间让焦点切换
                        delay 0.2
                        
                        -- 获取当前前台应用
                        set frontApp to first application process whose frontmost is true
                        set frontAppName to name of frontApp
                        
                        -- 执行粘贴（如果不是clipboard-app）
                        if frontAppName is not "clipboard-app" then
                            keystroke "v" using {command down}
                            return "Pasted to: " & frontAppName
                        else
                            return "Failed: still on clipboard-app"
                        end if
                    end tell
                "#;

                let result = Command::new("osascript")
                    .arg("-e")
                    .arg(hide_and_paste_script)
                    .output();

                match result {
                    Ok(output) => {
                        if output.status.success() {
                            let result_msg =
                                String::from_utf8_lossy(&output.stdout).trim().to_string();
                            println!("[paste_text] {}", result_msg);
                        } else {
                            let stderr = String::from_utf8_lossy(&output.stderr);
                            println!("[paste_text] AppleScript错误: {}", stderr);
                        }
                    }
                    Err(e) => println!("[paste_text] 执行失败: {}", e),
                }

                Ok(())
            })
            .await??;
        }

        Ok(())
    }

    pub async fn paste_image(
        &self,
        file_path: String,
        app_handle: Option<tauri::AppHandle>,
    ) -> Result<()> {
        use std::fs;
        use std::path::PathBuf;

        // 解析文件路径
        let absolute_path = if file_path.starts_with("imgs/") {
            let config_dir = dirs::config_dir()
                .ok_or_else(|| anyhow::anyhow!("Unable to get config directory"))?;
            let app_dir = config_dir.join("clipboard-app");
            app_dir.join(&file_path)
        } else {
            PathBuf::from(&file_path)
        };

        if !absolute_path.exists() {
            return Err(anyhow::anyhow!("File not found: {:?}", absolute_path));
        }

        tokio::task::spawn_blocking(move || -> Result<()> {
            let image_data = fs::read(&absolute_path)?;

            // 使用arboard设置图片到剪切板
            let mut clipboard = Clipboard::new()?;

            // 确定图片格式
            let img = image::load_from_memory(&image_data)
                .map_err(|e| anyhow::anyhow!("Failed to load image: {}", e))?;

            // 转换为RGB格式
            let rgba_img = img.to_rgba8();
            let (width, height) = rgba_img.dimensions();

            let img_data = arboard::ImageData {
                width: width as usize,
                height: height as usize,
                bytes: rgba_img.into_raw().into(),
            };

            clipboard
                .set_image(img_data)
                .map_err(|e| anyhow::anyhow!("Failed to set image to clipboard: {}", e))?;

            Ok(())
        })
        .await??;

        // 切换应用焦点并粘贴（macOS）
        #[cfg(target_os = "macos")]
        {
            tokio::task::spawn_blocking(move || -> Result<()> {
                use std::process::Command;

                println!("[paste_image] 开始执行图片粘贴流程");

                // 隐藏clipboard-app窗口，让下层应用自动获得焦点
                let hide_and_paste_script = r#"
                    tell application "System Events"
                        -- 隐藏clipboard-app窗口（不是最小化）
                        set visible of process "clipboard-app" to false
                        
                        -- 等待一小段时间让焦点切换
                        delay 0.2
                        
                        -- 获取当前前台应用
                        set frontApp to first application process whose frontmost is true
                        set frontAppName to name of frontApp
                        
                        -- 执行粘贴（如果不是clipboard-app）
                        if frontAppName is not "clipboard-app" then
                            keystroke "v" using {command down}
                            return "Pasted image to: " & frontAppName
                        else
                            return "Failed: still on clipboard-app"
                        end if
                    end tell
                "#;

                let result = Command::new("osascript")
                    .arg("-e")
                    .arg(hide_and_paste_script)
                    .output();

                match result {
                    Ok(output) => {
                        if output.status.success() {
                            let result_msg =
                                String::from_utf8_lossy(&output.stdout).trim().to_string();
                            println!("[paste_image] {}", result_msg);
                        } else {
                            let stderr = String::from_utf8_lossy(&output.stderr);
                            println!("[paste_image] AppleScript错误: {}", stderr);
                        }
                    }
                    Err(e) => println!("[paste_image] 执行失败: {}", e),
                }

                Ok(())
            })
            .await??;
        }

        Ok(())
    }

    // Configuration management methods
    pub async fn get_config(&self) -> Result<AppConfig> {
        let config_manager = self.config_manager.lock().await;
        Ok(config_manager.config.clone())
    }

    pub async fn update_config(&self, config: AppConfig) -> Result<()> {
        let mut config_manager = self.config_manager.lock().await;
        config_manager.update_config(config).await?;
        Ok(())
    }

    // Global shortcut methods
    pub async fn register_global_shortcut(
        &self,
        app_handle: AppHandle,
        shortcut: String,
    ) -> Result<()> {
        let parsed_shortcut = shortcut
            .parse::<Shortcut>()
            .map_err(|e| anyhow::anyhow!("Invalid shortcut format: {}", e))?;

        let global_shortcut_manager = app_handle.global_shortcut();

        // Unregister existing shortcut if any
        if let Some(current) = self.current_shortcut.lock().await.as_ref() {
            let current_shortcut = current
                .parse::<Shortcut>()
                .map_err(|e| anyhow::anyhow!("Invalid current shortcut: {}", e))?;
            global_shortcut_manager
                .unregister(current_shortcut)
                .map_err(|e| anyhow::anyhow!("Failed to unregister shortcut: {}", e))?;
        }

        // Register new shortcut - the API only takes the shortcut, callback is handled via events
        global_shortcut_manager
            .register(parsed_shortcut)
            .map_err(|e| anyhow::anyhow!("Failed to register shortcut: {}", e))?;

        // Update stored shortcut
        let mut current_shortcut = self.current_shortcut.lock().await;
        *current_shortcut = Some(shortcut);

        Ok(())
    }

    pub async fn unregister_global_shortcut(&self) -> Result<()> {
        if let Some(app_handle) = self.app_handle.lock().await.as_ref() {
            if let Some(current) = self.current_shortcut.lock().await.as_ref() {
                let current_shortcut = current
                    .parse::<Shortcut>()
                    .map_err(|e| anyhow::anyhow!("Invalid current shortcut: {}", e))?;
                let global_shortcut_manager = app_handle.global_shortcut();
                global_shortcut_manager
                    .unregister(current_shortcut)
                    .map_err(|e| anyhow::anyhow!("Failed to unregister shortcut: {}", e))?;

                let mut current_shortcut_guard = self.current_shortcut.lock().await;
                *current_shortcut_guard = None;
            }
        }
        Ok(())
    }

    // Auto startup methods
    pub async fn set_auto_startup(&self, enabled: bool) -> Result<()> {
        if let Some(app_handle) = self.app_handle.lock().await.as_ref() {
            let autolaunch_manager = app_handle.autolaunch();
            if enabled {
                autolaunch_manager
                    .enable()
                    .map_err(|e| anyhow::anyhow!("Failed to enable auto startup: {}", e))?;
            } else {
                autolaunch_manager
                    .disable()
                    .map_err(|e| anyhow::anyhow!("Failed to disable auto startup: {}", e))?;
            }
        }
        Ok(())
    }

    pub async fn get_auto_startup_status(&self) -> Result<bool> {
        if let Some(app_handle) = self.app_handle.lock().await.as_ref() {
            let autolaunch_manager = app_handle.autolaunch();
            let status = autolaunch_manager
                .is_enabled()
                .map_err(|e| anyhow::anyhow!("Failed to get auto startup status: {}", e))?;
            Ok(status)
        } else {
            Ok(false)
        }
    }

    // Cache statistics
    pub async fn get_cache_statistics(&self) -> Result<CacheStatistics> {
        // Get database size
        let db_path = self.get_db_path()?;
        let db_size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);

        // Get images directory size
        let images_path = self.get_images_path()?;
        let images_size = if images_path.exists() {
            self.calculate_directory_size(&images_path)?
        } else {
            0
        };

        // Get entry counts
        let total_entries: i64 = sqlx::query("SELECT COUNT(*) as count FROM clipboard_entries")
            .fetch_one(self.db.pool())
            .await?
            .get("count");

        let text_entries: i64 = sqlx::query(
            "SELECT COUNT(*) as count FROM clipboard_entries WHERE content_type LIKE 'text%'",
        )
        .fetch_one(self.db.pool())
        .await?
        .get("count");

        let image_entries: i64 = sqlx::query(
            "SELECT COUNT(*) as count FROM clipboard_entries WHERE content_type LIKE 'image%'",
        )
        .fetch_one(self.db.pool())
        .await?
        .get("count");

        Ok(CacheStatistics {
            db_size_bytes: db_size,
            images_size_bytes: images_size,
            total_entries,
            text_entries,
            image_entries,
        })
    }

    // Cleanup methods
    pub async fn check_and_cleanup_daily(&self) -> Result<()> {
        let now = Utc::now();
        let mut last_cleanup = self.last_cleanup_date.lock().await;

        let should_cleanup = match *last_cleanup {
            Some(last) => (now.date_naive() - last.date_naive()).num_days() >= 1,
            None => true,
        };

        if should_cleanup {
            println!("[cleanup] Starting daily cleanup...");
            let result = self.cleanup_expired_entries().await?;
            println!("[cleanup] Cleanup completed: {} entries removed, {} images removed, {} bytes freed", 
                     result.entries_removed, result.images_removed, result.size_freed_bytes);
            *last_cleanup = Some(now);
        }

        Ok(())
    }

    pub async fn cleanup_expired_entries(&self) -> Result<CleanupResult> {
        let config = self.get_config().await?;
        let now = Utc::now().timestamp_millis();

        // Get cutoff times, skip cleanup for Never expiry
        let text_cutoff = match config.text.expiry.as_days() {
            Some(days) => {
                let expiry_ms = (days as i64) * 24 * 60 * 60 * 1000;
                Some(now - expiry_ms)
            }
            None => None, // Never expire
        };

        let image_cutoff = match config.image.expiry.as_days() {
            Some(days) => {
                let expiry_ms = (days as i64) * 24 * 60 * 60 * 1000;
                Some(now - expiry_ms)
            }
            None => None, // Never expire
        };

        // Get entries to remove
        let expired_text_entries = match text_cutoff {
            Some(cutoff) => sqlx::query("SELECT id, file_path FROM clipboard_entries WHERE content_type LIKE 'text%' AND created_at < ?")
                .bind(cutoff)
                .fetch_all(self.db.pool())
                .await?,
            None => vec![], // Never expire text
        };

        let expired_image_entries = match image_cutoff {
            Some(cutoff) => sqlx::query("SELECT id, file_path FROM clipboard_entries WHERE content_type LIKE 'image%' AND created_at < ?")
                .bind(cutoff)
                .fetch_all(self.db.pool())
                .await?,
            None => vec![], // Never expire images
        };

        let mut entries_removed = 0;
        let mut images_removed = 0;
        let mut size_freed = 0u64;

        // Remove text entries
        for row in expired_text_entries {
            let id: String = row.get("id");
            sqlx::query("DELETE FROM clipboard_entries WHERE id = ?")
                .bind(&id)
                .execute(self.db.pool())
                .await?;
            entries_removed += 1;
        }

        // Remove image entries and files
        for row in expired_image_entries {
            let id: String = row.get("id");
            let file_path: Option<String> = row.get("file_path");

            sqlx::query("DELETE FROM clipboard_entries WHERE id = ?")
                .bind(&id)
                .execute(self.db.pool())
                .await?;
            entries_removed += 1;

            // Remove image file if exists
            if let Some(relative_path) = file_path {
                let images_dir = self.get_images_path()?;
                let full_path = images_dir.join(&relative_path.replace("imgs/", ""));

                if full_path.exists() {
                    if let Ok(metadata) = std::fs::metadata(&full_path) {
                        size_freed += metadata.len();
                    }
                    let _ = std::fs::remove_file(&full_path);
                    images_removed += 1;
                }
            }
        }

        Ok(CleanupResult {
            entries_removed,
            images_removed,
            size_freed_bytes: size_freed,
        })
    }

    // Helper methods
    fn get_db_path(&self) -> Result<PathBuf> {
        let config_dir =
            dirs::config_dir().ok_or_else(|| anyhow::anyhow!("Unable to get config directory"))?;
        Ok(config_dir.join("clipboard-app").join("clipboard.db"))
    }

    fn get_images_path(&self) -> Result<PathBuf> {
        let config_dir =
            dirs::config_dir().ok_or_else(|| anyhow::anyhow!("Unable to get config directory"))?;
        Ok(config_dir.join("clipboard-app").join("imgs"))
    }

    fn calculate_directory_size(&self, path: &PathBuf) -> Result<u64> {
        let mut size = 0u64;
        if path.is_dir() {
            for entry in std::fs::read_dir(path)? {
                let entry = entry?;
                let metadata = entry.metadata()?;
                if metadata.is_file() {
                    size += metadata.len();
                } else if metadata.is_dir() {
                    size += self.calculate_directory_size(&entry.path())?;
                }
            }
        }
        Ok(size)
    }
}
