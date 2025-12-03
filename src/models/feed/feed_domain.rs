use crate::models::tags::Tag;
use crate::models::comments::ItemComment;
use horatio_macro::buildamp_domain;

#[buildamp_domain]
pub struct MicroblogItem {
    pub id: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
    #[serde(default)]
    pub comments: Vec<ItemComment>,
    pub timestamp: u64,
}

#[buildamp_domain]
pub struct SubmitItemData {
    #[dependency(source = "table:tags")]
    pub existing_tags: Vec<Tag>,
    pub fresh_tag_ids: Vec<String>,
}