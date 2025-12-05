use crate::models::feed::{MicroblogItem, SubmitItemData};
use horatio_macro::{buildamp_api, buildamp_domain};

#[buildamp_api(path = "GetFeed")]
pub struct GetFeedReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

#[buildamp_domain]
pub struct GetFeedRes {
    pub items: Vec<MicroblogItem>,
}

#[buildamp_api(path = "SubmitItem", bundle_with = "SubmitItemData")]
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