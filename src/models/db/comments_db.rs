use crate::db_identity_db::Guest;
use crate::framework::database_types::*;
use horatio_macro::buildamp_domain;

// Database model - generates SQL queries automatically (no macro needed)
// TODO: Remove buildamp_domain when directory-based generation is implemented
#[buildamp_domain]
pub struct ItemComment {
    pub id: DatabaseId<String>,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub timestamp: Timestamp,
}

// Database model - generates SQL queries automatically (no macro needed)
// TODO: Remove buildamp_domain when directory-based generation is implemented  
#[buildamp_domain]
pub struct SubmitCommentData {
    #[dependency(source = "table:guests:by_session")]
    pub existing_guest: Option<Guest>,
    pub fresh_guest_id: String,
    pub fresh_comment_id: String,
}