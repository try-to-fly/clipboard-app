use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ClipboardEntry {
    pub id: String,
    pub content_hash: String,
    pub content_type: String,
    pub content_data: Option<String>,
    pub source_app: Option<String>,
    pub created_at: i64,
    pub copy_count: i32,
    pub file_path: Option<String>,
    pub is_favorite: bool,
    pub content_subtype: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContentType {
    Text,
    Image,
    File,
    Unknown,
}

impl ContentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ContentType::Text => "text",
            ContentType::Image => "image",
            ContentType::File => "file",
            ContentType::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Statistics {
    pub total_entries: i64,
    pub total_copies: i64,
    pub most_copied: Vec<ClipboardEntry>,
    pub recent_apps: Vec<AppUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppUsage {
    pub app_name: String,
    pub count: i64,
}

impl ClipboardEntry {
    pub fn new(
        content_type: ContentType,
        content_data: Option<String>,
        content_hash: String,
        source_app: Option<String>,
        file_path: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            content_hash,
            content_type: content_type.as_str().to_string(),
            content_data,
            source_app,
            created_at: Utc::now().timestamp_millis(),
            copy_count: 1,
            file_path,
            is_favorite: false,
            content_subtype: None,
            metadata: None,
        }
    }
}
