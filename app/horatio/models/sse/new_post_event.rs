pub struct NewPostEvent {
    pub post_id: String,
    pub title: String,
    pub author_name: String,
    pub author_id: String,
    pub extract: Option<String>,
    pub tags: Vec<String>,
    pub timestamp: i64,
    pub link: Option<String>,
    pub image: Option<String>,
}