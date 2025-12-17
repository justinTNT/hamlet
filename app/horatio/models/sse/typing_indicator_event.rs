pub struct TypingIndicatorEvent {
    pub user_id: String,
    pub display_name: String,
    pub post_id: String,
    pub is_typing: bool,
    pub timestamp: i64,
}