use horatio_macro::{buildamp_domain, buildamp_api};
use crate::models::tags::Tag;
use crate::models::comments::ItemComment;

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

#[buildamp_api]
#[api(path = "GetFeed")]
pub struct GetFeedReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

#[buildamp_domain]
pub struct GetFeedRes {
    pub items: Vec<MicroblogItem>,
}

#[buildamp_domain]
pub struct SubmitItemData {
    #[dependency(source = "table:tags")]
    pub existing_tags: Vec<Tag>,
    pub fresh_tag_ids: Vec<String>,
}

#[buildamp_api]
#[api(path = "SubmitItem", bundle_with = "SubmitItemData")]
pub struct SubmitItemReq {
    #[serde(default)]
    pub host: String,
    #[api(Required)]
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
}

#[buildamp_domain]
pub struct SubmitItemRes {
    pub item: MicroblogItem,
}
