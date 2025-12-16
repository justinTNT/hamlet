use crate::framework::storage_types::*;

pub struct ViewportState {
    pub scroll_y: SessionData<f64>,              // Explicitly session-only
    pub selected_item: SessionData<Option<String>>, // Explicitly session-only
    pub sidebar_collapsed: CrossTab<bool>,       // Explicitly cross-tab synced
}

