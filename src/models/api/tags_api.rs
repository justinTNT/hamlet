use horatio_macro::{buildamp_api, buildamp_domain};

#[buildamp_api(path = "GetTags")]
pub struct GetTagsReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

// API response model - generates Elm types automatically (directory-based)
// TODO: Remove buildamp_domain when directory-based generation is implemented
#[buildamp_domain]
pub struct GetTagsRes {
    pub tags: Vec<String>,
}