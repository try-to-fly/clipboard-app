use crate::clipboard::{ClipboardMonitor, ContentProcessor};
use crate::database::Database;
use crate::models::{ClipboardEntry, Statistics, AppUsage, ContentType};
use anyhow::Result;
use arboard::Clipboard;
use sqlx::Row;
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex, RwLock};
use tauri::{AppHandle, Manager};

pub struct AppState {
    pub db: Arc<Database>,
    pub monitor: Arc<RwLock<Option<ClipboardMonitor>>>,
    pub tx: broadcast::Sender<ClipboardEntry>,
    pub rx: Arc<Mutex<broadcast::Receiver<ClipboardEntry>>>,
    pub app_handle: Arc<Mutex<Option<AppHandle>>>,
    pub processor: Arc<ContentProcessor>,
}

impl AppState {
    pub async fn new() -> Result<Self> {
        let db = Arc::new(Database::new().await?);
        let (tx, rx) = broadcast::channel(100);
        let processor = Arc::new(ContentProcessor::new()?);
        
        Ok(Self {
            db,
            monitor: Arc::new(RwLock::new(None)),
            tx: tx.clone(),
            rx: Arc::new(Mutex::new(rx)),
            app_handle: Arc::new(Mutex::new(None)),
            processor,
        })
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        let mut app_handle = self.app_handle.blocking_lock();
        *app_handle = Some(handle);
    }

    pub async fn start_monitoring(&self) -> Result<()> {
        let mut monitor_guard = self.monitor.write().await;
        
        if monitor_guard.is_none() {
            let monitor = ClipboardMonitor::new(self.tx.clone(), Arc::clone(&self.processor))?;
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

    async fn start_database_save_task(&self) {
        let db = Arc::clone(&self.db);
        let mut rx = self.tx.subscribe();
        let app_handle = Arc::clone(&self.app_handle);
        
        tokio::spawn(async move {
            while let Ok(entry) = rx.recv().await {
                // 检查是否已存在相同内容
                let existing = sqlx::query(
                    "SELECT id, copy_count FROM clipboard_entries WHERE content_hash = ?"
                )
                .bind(&entry.content_hash)
                .fetch_optional(db.pool())
                .await;
                
                match existing {
                    Ok(Some(row)) => {
                        // 更新复制次数
                        let id: String = row.get("id");
                        let count: i32 = row.get("copy_count");
                        
                        let _ = sqlx::query(
                            "UPDATE clipboard_entries SET copy_count = ?, created_at = ? WHERE id = ?"
                        )
                        .bind(count + 1)
                        .bind(entry.created_at)
                        .bind(&id)
                        .execute(db.pool())
                        .await;
                    }
                    Ok(None) => {
                        // 插入新记录
                        let _ = sqlx::query(
                            r#"
                            INSERT INTO clipboard_entries 
                            (id, content_hash, content_type, content_data, source_app, 
                             created_at, copy_count, file_path, is_favorite)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            "#
                        )
                        .bind(&entry.id)
                        .bind(&entry.content_hash)
                        .bind(&entry.content_type)
                        .bind(&entry.content_data)
                        .bind(&entry.source_app)
                        .bind(entry.created_at)
                        .bind(entry.copy_count)
                        .bind(&entry.file_path)
                        .bind(entry.is_favorite as i32)
                        .execute(db.pool())
                        .await;
                    }
                    Err(e) => eprintln!("数据库查询错误: {}", e),
                }
                
                // 发送事件到前端
                if let Some(handle) = app_handle.lock().await.as_ref() {
                    let _ = handle.emit_all("clipboard-update", &entry);
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
                "#
            )
            .bind(format!("%{}%", search_term))
            .bind(format!("%{}%", search_term))
            .bind(limit)
            .bind(offset)
        } else {
            sqlx::query_as::<_, ClipboardEntry>(
                "SELECT * FROM clipboard_entries ORDER BY created_at DESC LIMIT ? OFFSET ?"
            )
            .bind(limit)
            .bind(offset)
        };
        
        let entries = query.fetch_all(self.db.pool()).await?;
        Ok(entries)
    }

    pub async fn toggle_favorite(&self, id: String) -> Result<()> {
        sqlx::query(
            "UPDATE clipboard_entries SET is_favorite = NOT is_favorite WHERE id = ?"
        )
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
            "SELECT * FROM clipboard_entries ORDER BY copy_count DESC LIMIT 10"
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
            "#
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
        let mut clipboard = Clipboard::new()?;
        clipboard.set_text(content)?;
        Ok(())
    }
}