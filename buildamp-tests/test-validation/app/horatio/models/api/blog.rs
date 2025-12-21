use buildamp_macro::buildamp;
use serde::{Deserialize, Serialize};
use elm_rs::Elm;

#[buildamp(path = "GetPosts")]
pub struct GetPostsReq {
    #[api(Inject = "host")]
    pub host: String,
}

#[derive(Debug, Serialize, Deserialize, Elm)]
pub struct GetPostsRes {
    pub posts: Vec<BlogPostItem>,
}

#[derive(Debug, Serialize, Deserialize, Elm)]
pub struct BlogPostItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub excerpt: String,
    pub author_name: String,
    pub categories: Vec<String>,
    pub created_at: i64,
}