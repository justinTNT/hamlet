use crate::models::tags::Tag;
use crate::models::comments::ItemComment;
use crate::framework::database_types::*;
use horatio_macro::buildamp_domain;

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
}

#[buildamp_domain]
pub struct SubmitItemData {
    #[dependency(source = "table:tags")]
    pub existing_tags: Vec<Tag>,
    pub fresh_tag_ids: Vec<String>,
}