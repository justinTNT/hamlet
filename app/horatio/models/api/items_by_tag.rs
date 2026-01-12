use buildamp_macro::buildamp;
use super::feed::FeedItem;

#[buildamp(path = "GetItemsByTag")]
pub struct GetItemsByTagReq {
    #[api(Inject = "host")]
    pub host: String,
    pub tag: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct GetItemsByTagRes {
    pub tag: String,
    pub items: Vec<FeedItem>,
}
