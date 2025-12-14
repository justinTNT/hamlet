// User-specific storage types
// Following BuildAmp file organization strategy - filename determines behavior

// User preferences and settings  
// Auto-derives: Clone, Serialize, Deserialize, Debug (directory-based)
// TODO: Remove manual derive when directory-based generation is implemented
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserPreferences {
    pub theme: String,
    pub notifications: bool,
    pub language: String,
}

// Authentication and authorization state
// Auto-derives: Clone, Serialize, Deserialize, Debug (directory-based)
// TODO: Remove manual derive when directory-based generation is implemented
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AuthState {
    pub user_id: String,
    pub session_token: String,
    pub expires_at: i64,
    pub permissions: Vec<String>,
}

