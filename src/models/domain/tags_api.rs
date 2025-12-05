use horatio_macro::{buildamp_api, buildamp_domain};

#[buildamp_api(path = "GetTags")]
pub struct GetTagsReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

#[buildamp_domain]
pub struct GetTagsRes {
    pub tags: Vec<String>,
}