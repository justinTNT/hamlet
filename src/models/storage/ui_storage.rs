// UI state and coordination storage types
// Following BuildAmp file organization strategy - filename determines behavior

use serde::{Deserialize, Serialize};

// Live cursor positions for real-time collaboration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub x: i32,
    pub y: i32,
    pub item_id: String,
    pub user_id: String,
}

// Viewport and scroll state persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportState {
    pub scroll_y: f64,
    pub selected_item: Option<String>,
    pub sidebar_collapsed: bool,
}

// Typing indicators for real-time editing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingIndicator {
    pub user_id: String,
    pub user_name: String,
    pub item_id: String,
    pub field: String,
    pub started_at: i64,
}

// User presence information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPresence {
    pub user_id: String,
    pub user_name: String,
    pub status: String, // "online", "away", "busy"
    pub current_page: Option<String>,
    pub last_seen: i64,
}

// Shared selection state for collaborative features
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionState {
    pub user_id: String,
    pub selected_items: Vec<String>,
    pub selection_type: String, // "single", "multiple", "range"
    pub anchor_item: Option<String>,
}

// Form draft state to prevent data loss
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormDraft {
    pub user_id: String,
    pub form_id: String,
    pub fields: std::collections::HashMap<String, String>,
    pub saved_at: i64,
}