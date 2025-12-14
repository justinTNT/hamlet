// Legacy domain directory - models have been moved to:
// - Database models: src/models/db/
// - API models: src/models/api/  
// This file kept for compatibility during migration

// Re-export from new locations
pub use crate::models::db::*;
pub use crate::models::api::*;
