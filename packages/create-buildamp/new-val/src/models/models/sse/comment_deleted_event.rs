pub struct CommentDeletedEvent {
    pub comment_id: String,
    pub post_id: String,
    pub author_id: String,
    pub timestamp: i64,
}