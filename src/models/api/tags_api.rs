use buildamp_macro::{buildamp, buildamp_domain};

#[buildamp(path = "GetTags")]
pub struct GetTagsReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

// API response model - gets decorations automatically via auto-discovery
pub struct GetTagsRes {
    pub tags: Vec<String>,
}