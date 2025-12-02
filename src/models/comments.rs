use horatio_macro::{buildamp_domain, buildamp_api};
use crate::models::identity::Guest;

#[buildamp_domain]
pub struct ItemComment {
    pub id: String,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub timestamp: u64,
}

#[buildamp_domain]
pub struct SubmitCommentData {
    #[dependency(source = "table:guests:by_session")]
    pub existing_guest: Option<Guest>,
    pub fresh_guest_id: String,
    pub fresh_comment_id: String,
}

#[buildamp_api]
#[api(server_context = "SubmitCommentData", path = "SubmitComment")]
pub struct SubmitCommentReq {
    #[api(Inject = "host")]
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
