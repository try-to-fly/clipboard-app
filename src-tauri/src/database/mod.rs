use anyhow::Result;
use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use std::path::PathBuf;

pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new() -> Result<Self> {
        let db_path = Self::get_db_path()?;

        // 确保目录存在
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let database_url = format!("sqlite:{}?mode=rwc", db_path.display());

        let pool = SqlitePool::connect(&database_url).await?;

        let db = Self { pool };
        db.init().await?;

        Ok(db)
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    fn get_db_path() -> Result<PathBuf> {
        let config_dir = dirs::config_dir().ok_or_else(|| anyhow::anyhow!("无法获取配置目录"))?;

        let app_dir = config_dir.join("clipboard-app");
        Ok(app_dir.join("clipboard.db"))
    }

    async fn init(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS clipboard_entries (
                id TEXT PRIMARY KEY,
                content_hash TEXT NOT NULL,
                content_type TEXT NOT NULL,
                content_data TEXT,
                source_app TEXT,
                created_at INTEGER NOT NULL,
                copy_count INTEGER DEFAULT 1,
                file_path TEXT,
                is_favorite INTEGER DEFAULT 0
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 创建索引
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON clipboard_entries(created_at DESC)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_content_hash ON clipboard_entries(content_hash)",
        )
        .execute(&self.pool)
        .await?;

        // 执行数据库迁移
        self.migrate().await?;

        Ok(())
    }

    async fn migrate(&self) -> Result<()> {
        // 添加 content_subtype 字段（如果不存在）
        let _ = sqlx::query("ALTER TABLE clipboard_entries ADD COLUMN content_subtype TEXT")
            .execute(&self.pool)
            .await;

        // 添加 metadata 字段（如果不存在）
        let _ = sqlx::query("ALTER TABLE clipboard_entries ADD COLUMN metadata TEXT")
            .execute(&self.pool)
            .await;

        // 为新字段创建索引
        let _ = sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_content_subtype ON clipboard_entries(content_subtype)",
        )
        .execute(&self.pool)
        .await;

        Ok(())
    }
}
