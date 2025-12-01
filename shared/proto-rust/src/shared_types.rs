use serde::{Serialize, Deserialize};
use elm_rs::{Elm, ElmEncode, ElmDecode};
use utoipa::ToSchema;

// --- API Error Definition ---
#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
#[serde(tag = "type")]
pub enum ApiError {
    ValidationError { details: String },
    NotFound { details: String },
    InternalError { details: String },
}

// --- Context for Validation ---
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Context {
    pub user_id: Option<String>,
    pub role: String,
    pub host: String,
    #[serde(default)]
    pub is_extension: bool,
}

// --- Generic API Response Wrapper ---
#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
#[serde(untagged)]
pub enum ApiResponse<T> {
    Success(T),
    Error(ApiError),
}

// --- Data Models ---

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema)]
pub struct Tag {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema)]
pub struct MicroblogItem {
    pub id: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>, // List of tag names
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct Guest {
    pub id: String,
    pub name: String,
    // Simplified auth for now
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct ItemComment {
    pub id: String,
    pub item_id: String,
    pub guest_id: String,
    pub text: String,
    pub timestamp: u64,
}

// --- API Requests/Responses ---

use horatio_macro::HoratioEndpoint;


#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioEndpoint)]
#[horatio(path = "GetFeed")]
pub struct GetFeedReq {
    #[serde(default)]
    #[horatio(Inject = "host")]
    pub host: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema)]
pub struct GetFeedRes {
    pub items: Vec<MicroblogItem>,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioEndpoint)]
#[horatio(path = "GetTags")]
pub struct GetTagsReq {
    #[serde(default)]
    #[horatio(Inject = "host")]
    pub host: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema)]
pub struct GetTagsRes {
    pub tags: Vec<String>, // Just names for now, or full Tag objects? Plan said strings in dropdown.
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioEndpoint)]
#[horatio(path = "SubmitItem", response = "SubmitItemRes")]
pub struct SubmitItemReq {
    #[serde(default)]
    #[horatio(Inject = "host")]
    pub host: String,
    #[horatio(Required, Trim, MinLength(1), MaxLength(100))]
    pub title: String,
    #[horatio(Trim, Url)]
    pub link: String,
    #[horatio(Trim, Url)]
    pub image: String,
    #[horatio(Trim, MaxLength(500))]
    pub extract: String,
    #[horatio(Trim, MaxLength(1000))]
    pub owner_comment: String,
    #[horatio(MaxLength(10))]
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema)]
pub struct SubmitItemRes {
    pub item: MicroblogItem,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct SubmitCommentReq {
    pub host: String,
    pub item_id: String,
    pub guest_id: String,
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct SubmitCommentRes {
    pub comment: ItemComment,
}
