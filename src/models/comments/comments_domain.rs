use crate::models::identity::Guest;
use horatio_macro::buildamp_domain;

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