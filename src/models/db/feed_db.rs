use crate::db_tags_db::Tag;
use crate::db_comments_db::ItemComment;
use crate::framework::database_types::*;
use horatio_macro::buildamp_domain;

// Database model - generates SQL queries automatically (no macro needed)
// TODO: Remove buildamp_domain when directory-based generation is implemented
#[buildamp_domain]
pub struct MicroblogItem {
    pub id: DatabaseId<String>,
    pub title: String,
    pub link: Option<String>,
    pub image: Option<String>,
    pub extract: Option<String>,
    pub owner_comment: DefaultComment,
    pub tags: Vec<String>,
    #[serde(default)]
    pub comments: Vec<ItemComment>,
    pub timestamp: Timestamp,
    // NEW FIELD: This demonstrates BuildAmp's type evolution
    // When we add this field in Rust, Elm automatically gets it
    #[serde(default)]
    pub view_count: i32,
}

// Database model - generates SQL queries automatically (no macro needed)  
// TODO: Remove buildamp_domain when directory-based generation is implemented
#[buildamp_domain]
pub struct SubmitItemData {
    #[dependency(source = "table:tags")]
    pub existing_tags: Vec<Tag>,
    pub fresh_tag_ids: Vec<String>,
}