pub struct ProcessingStep {
    pub step_name: String,       // Default = persistent
    pub status: String,          // Default = persistent
    pub started_at: Option<i64>, // Default = persistent
    pub completed_at: Option<i64>, // Default = persistent
    pub error_message: Option<String>, // Default = persistent
}



