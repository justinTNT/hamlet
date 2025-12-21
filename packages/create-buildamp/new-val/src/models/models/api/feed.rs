use buildamp_macro::buildamp;

#[buildamp(path = "GetFeed")]
pub struct GetFeedReq {
    #[api(Inject = "host")]
    pub host: String,
}

pub struct FeedItem {
    pub id: String,
    pub title: String,
    pub link: Option<String>,
    pub image: Option<String>,
    pub extract: Option<String>,
    pub owner_comment: String,
    pub tags: Vec<String>,
    pub timestamp: u64,
    pub view_count: i32,
}

pub struct GetFeedRes {
    pub items: Vec<FeedItem>,
}

// Server context for SubmitItem - belongs in API, not DB
pub struct SubmitItemData {
    pub fresh_tag_ids: Vec<String>,
}

#[buildamp(path = "SubmitItem", server_context = "SubmitItemData")]
pub struct SubmitItemReq {
    pub host: String,
    #[api(Required)]
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
}

pub struct SubmitItemRes {
    pub item: FeedItem,
}
