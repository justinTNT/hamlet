use crate::framework::event_types::{CorrelationId, ExecuteAt, DateTime, Cron};

pub struct ProcessVideo {
    pub correlation_id: CorrelationId,    // Required framework type for tracing
    pub video_id: String,                 // Required business data
    pub execute_at: ExecuteAt<DateTime>,  // Required - when to start processing
    pub quality_preset: Option<String>,   // Optional - use default if None
    pub webhook_url: Option<String>,      // Optional - no callback if None
}

pub struct GenerateDailyReport {
    pub user_id: String,                  // Required business data
    pub execute_at: ExecuteAt<Cron>,      // Required framework type for scheduling
    pub report_type: String,              // Required business data
    pub email_results: Option<String>,    // Optional - no email if None
}