use buildamp_macro::buildamp;
use super::comment::CommentItem;

#[buildamp(path = "GetFeed")]
pub struct GetFeedReq {
    #[api(Inject = "host")]
    pub host: String,
}

// Simplified item for feed view - no comments, tags, or link
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct FeedItem {
    pub id: String,
    pub title: String,
    pub image: Option<String>,
    pub extract: Option<String>,
    pub owner_comment: String,     // The owner's comment on the item
    pub timestamp: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct GetFeedRes {
    pub items: Vec<FeedItem>,
}

// Full item with all details - used by GetItem and SubmitItem
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct MicroblogItem {
    pub id: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
    pub comments: Vec<CommentItem>,
    pub timestamp: u64,
}

// Server context for SubmitItem - belongs in API, not DB
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct SubmitItemData {
    pub fresh_tag_ids: Vec<String>,
}

#[buildamp(path = "SubmitItem", server_context = "SubmitItemData")]
pub struct SubmitItemReq {
    pub host: String,
    #[api(Required)]
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct SubmitItemRes {
    pub item: MicroblogItem,  // Returns full item after creation
}
