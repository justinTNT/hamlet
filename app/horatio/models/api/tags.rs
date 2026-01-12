use buildamp_macro::buildamp;

#[buildamp(path = "GetTags")]
pub struct GetTagsReq {
    #[api(Inject = "host")]
    pub host: String,
}

// API response model - gets decorations automatically via auto-discovery
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct GetTagsRes {
    pub tags: Vec<String>,
}
