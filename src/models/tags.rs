use horatio_macro::{buildamp_domain, buildamp_api};

#[buildamp_domain]
pub struct Tag {
    pub id: String,
    pub name: String,
}

#[buildamp_api]
#[api(path = "GetTags")]
pub struct GetTagsReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

#[buildamp_domain]
pub struct GetTagsRes {
    pub tags: Vec<String>,
}
