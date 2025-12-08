// Application-level storage types
// Following BuildAmp file organization strategy - filename determines behavior

use serde::{Deserialize, Serialize};

// Application configuration and settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub app_name: String,
    pub version: String,
    pub feature_flags: Vec<String>,
    pub maintenance_mode: bool,
}

// Popular tags cache
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PopularTags {
    pub tags: Vec<TagUsage>,
    pub calculated_at: i64,
    pub window_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagUsage {
    pub name: String,
    pub count: u32,
}

// Background job progress tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobProgress {
    pub job_id: String,
    pub job_type: String,
    pub progress_percent: f32,
    pub status: String, // "pending", "running", "completed", "failed"
    pub started_at: i64,
    pub estimated_completion: Option<i64>,
    pub error_message: Option<String>,
}

// External API response cache
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiCache {
    pub endpoint: String,
    pub cache_key: String,
    pub response_data: String, // JSON string
    pub cached_at: i64,
    pub ttl_seconds: u32,
}

// File upload/processing status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileProcessingStatus {
    pub file_id: String,
    pub original_name: String,
    pub status: String, // "uploading", "processing", "completed", "failed"
    pub progress_percent: f32,
    pub processing_steps: Vec<ProcessingStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingStep {
    pub step_name: String,
    pub status: String,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub error_message: Option<String>,
}

// User engagement metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserEngagement {
    pub user_id: String,
    pub posts_count: u32,
    pub comments_count: u32,
    pub last_activity: i64,
    pub favorite_tags: Vec<String>,
    pub calculated_at: i64,
}