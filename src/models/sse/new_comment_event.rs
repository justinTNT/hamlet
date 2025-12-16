pub struct NewCommentEvent {
    pub comment_id: String,
    pub post_id: String,
    pub parent_comment_id: Option<String>,
    pub author_name: String,
    pub author_id: String,
    pub text: String,
    pub timestamp: i64,
}