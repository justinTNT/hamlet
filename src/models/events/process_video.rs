use crate::framework::event_types::{CorrelationId, ExecuteAt, DateTime};

pub struct ProcessVideo {
    pub correlation_id: CorrelationId<String>,    // Required framework type for tracing
    pub video_id: String,                 // Required business data
    pub execute_at: ExecuteAt<DateTime>,  // Required - when to start processing
    pub quality_preset: Option<String>,   // Optional - use default if None
    pub webhook_url: Option<String>,      // Optional - no callback if None
}

pub struct GenerateDailyReport {
    pub user_id: String,                  // Required business data
    pub cron_expression: String,          // Regular string instead of framework type 
    pub timezone: Option<String>,         // Optional timezone
    pub report_type: String,              // Required business data
    pub email_results: Option<String>,    // Optional - no email if None
}