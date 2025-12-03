use super::comments_domain::{ItemComment, SubmitCommentData};
use horatio_macro::{buildamp_api, buildamp_domain};

#[buildamp_api]
#[api(server_context = "SubmitCommentData", path = "SubmitComment")]
pub struct SubmitCommentReq {
    #[api(Inject = "host")]
    #[serde(default)]
    pub host: String,
    pub item_id: String,
    pub parent_id: Option<String>,
    #[api(Required, Trim, MinLength(1), MaxLength(500))]
    pub text: String,
    pub author_name: Option<String>,
}

#[buildamp_domain]
pub struct SubmitCommentRes {
    pub comment: ItemComment,
}