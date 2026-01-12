use buildamp_macro::buildamp;

#[buildamp(path = "GetItem")]
pub struct GetItemReq {
    #[api(Inject = "host")]
    pub host: String,
    pub id: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct GetItemRes {
    pub item: crate::models::api::feed::MicroblogItem,
}