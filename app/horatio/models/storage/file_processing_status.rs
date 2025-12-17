use crate::framework::storage_types::*;
use crate::storage_processing_step::ProcessingStep;

pub struct FileProcessingStatus {
    pub file_id: StorageKey,              // Storage key identifier
    pub original_name: String,            // Default = persistent
    pub status: CrossTab<String>,         // Explicitly cross-tab synced
    pub progress_percent: CrossTab<f32>,  // Explicitly cross-tab synced
    pub processing_steps: UserCache<Vec<ProcessingStep>>, // Explicitly cached
}

