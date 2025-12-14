// UI state and coordination storage types
// Following BuildAmp file organization strategy - filename determines behavior

// Viewport and scroll state persistence
// Auto-derives: Clone, Serialize, Deserialize, Debug (directory-based)
// TODO: Remove manual derive when directory-based generation is implemented
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ViewportState {
    pub scroll_y: f64,
    pub selected_item: Option<String>,
    pub sidebar_collapsed: bool,
}

