use buildamp_macro::buildamp;

// Server context for SubmitComment - belongs in API, not DB  
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

pub struct CommentItem {
    pub id: String,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub timestamp: u64,
}

pub struct SubmitCommentRes {
    pub comment: CommentItem,
}
