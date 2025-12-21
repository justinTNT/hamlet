use crate::framework::database_types::*;

pub struct BlogPost {
    pub id: DatabaseId<String>,
    pub data: JsonBlob<BlogPostData>,
    pub created_at: Timestamp,
    pub view_count: i32,
}

pub struct BlogPostData {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub author_note: DefaultComment,
}