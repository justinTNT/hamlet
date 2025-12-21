use crate::framework::api::*;

#[buildamp_api]
pub struct GetPostsReq {
    pub host: String,
}

#[buildamp_api]
pub struct GetPostsRes {
    pub posts: Vec<BlogPostItem>,
}

pub struct BlogPostItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub excerpt: String,
    pub author_note: String,
    pub categories: Vec<String>,
    pub created_at: i64,
}