// Background event types for system maintenance and cleanup
// Following BuildAmp file organization strategy - filename determines behavior

// Regular maintenance tasks
pub struct CleanupTempFiles {
    pub older_than_days: u32,
    pub max_files: Option<u32>,
}

pub struct GenerateDailyDigest {
    pub for_date: String,
    pub subscriber_count: u32,
}

pub struct ArchiveOldComments {
    pub older_than_days: u32,
    pub max_comments: Option<u32>,
}

// Analytics and reporting
pub struct GenerateWeeklyReport {
    pub week_start: i64,
    pub week_end: i64,
    pub host: String,
}

pub struct UpdateUserActivityStats {
    pub user_id: String,
    pub activity_date: String,
}

// Content processing
pub struct ProcessSpamDetection {
    pub comment_id: String,
    pub comment_text: String,
    pub author_id: String,
}

pub struct UpdateSearchIndex {
    pub item_id: String,
    pub item_type: String, // "comment", "post", etc
    pub content: String,
}