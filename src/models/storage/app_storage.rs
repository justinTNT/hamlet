// Application-level storage types
// Following BuildAmp file organization strategy - filename determines behavior

// File upload/processing status
// Auto-derives: Clone, Serialize, Deserialize, Debug (directory-based)
// TODO: Remove manual derive when directory-based generation is implemented
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileProcessingStatus {
    pub file_id: String,
    pub original_name: String,
    pub status: String, // "uploading", "processing", "completed", "failed"
    pub progress_percent: f32,
    pub processing_steps: Vec<ProcessingStep>,
}

// Auto-derives: Clone, Serialize, Deserialize, Debug (directory-based)
// TODO: Remove manual derive when directory-based generation is implemented
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProcessingStep {
    pub step_name: String,
    pub status: String,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub error_message: Option<String>,
}

