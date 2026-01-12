use buildamp_macro::buildamp;

// Server context for SubmitComment - belongs in API, not DB  
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct SubmitCommentData {
    pub fresh_guest_id: String,
    pub fresh_comment_id: String,
}

#[buildamp(path = "SubmitComment", server_context = "SubmitCommentData")]
pub struct SubmitCommentReq {
    #[api(Inject = "host")]
    pub host: String,
    pub item_id: String,
    pub parent_id: Option<String>,
    #[api(Required, Trim, MinLength(1), MaxLength(500))]
    pub text: String,
    pub author_name: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct CommentItem {
    pub id: String,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub timestamp: u64,
}

// Type alias for consistency - ItemComment is used in MicroblogItem
pub type ItemComment = CommentItem;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct SubmitCommentRes {
    pub comment: CommentItem,
}
