// User-specific storage types
// Following BuildAmp file organization strategy - filename determines behavior

use serde::{Deserialize, Serialize};

// User preferences and settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub theme: String,
    pub notifications: bool,
    pub language: String,
}

// Session cache for expensive user data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionCache {
    pub user_id: String,
    pub permissions: Vec<String>,
    pub last_activity: i64,
}

// Authentication and authorization state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub user_id: String,
    pub session_token: String,
    pub expires_at: i64,
    pub permissions: Vec<String>,
}

// Draft blog post content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DraftPost {
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub updated_at: i64,
}

// Reading position in long posts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingPosition {
    pub user_id: String,
    pub post_id: String,
    pub scroll_offset: f64,
    pub last_read: i64,
}

// User context hydration cache
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserContext {
    pub user_id: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub team_memberships: Vec<String>,
    pub cached_at: i64,
}