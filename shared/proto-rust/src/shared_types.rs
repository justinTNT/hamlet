use serde::{Serialize, Deserialize};
use elm_rs::{Elm, ElmEncode, ElmDecode};
use utoipa::ToSchema;

// --- API Error Definition ---
#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
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

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema, HoratioElm)]
pub struct Tag {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema, HoratioElm)]
pub struct MicroblogItem {
    pub id: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>, // List of tag names
    #[serde(default)]
    pub comments: Vec<ItemComment>, // Nested comments
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
pub struct Guest {
    pub id: String,
    pub name: String,
    // Simplified auth for now
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema, HoratioElm)]
pub struct ItemComment {
    pub id: String,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String, // Fetched via join
    pub text: String,
    pub timestamp: u64,
}

// --- API Requests/Responses ---

use horatio_macro::{HoratioEndpoint, HoratioElm};


#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioEndpoint, HoratioElm)]
#[api(path = "SubmitItem", bundle_with = "SubmitItemData")]
pub struct SubmitItemReq {
    #[serde(default)]
    pub host: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioEndpoint, HoratioElm)]
#[api(path = "GetFeed")]
pub struct GetFeedReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema, HoratioElm)]
pub struct GetFeedRes {
    pub items: Vec<MicroblogItem>,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioEndpoint, HoratioElm)]
#[api(path = "GetTags")]
pub struct GetTagsReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema, HoratioElm)]
pub struct GetTagsRes {
    pub tags: Vec<String>, // Just names for now, or full Tag objects? Plan said strings in dropdown.
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
pub struct SubmitCommentData {
    pub existing_guest: Option<Guest>, // Found via session_id
    pub fresh_guest_id: String,        // Pre-generated if needed
    pub fresh_comment_id: String,      // Pre-generated
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioEndpoint, HoratioElm)]
#[api(bundle_with = "SubmitCommentData", path = "SubmitComment")]
pub struct SubmitCommentReq {
    #[api(Inject = "host")]
    pub host: String,
    pub item_id: String,
    pub parent_id: Option<String>,
    #[api(Required, Trim, MinLength(1), MaxLength(500))]
    pub content: String,
}



#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
pub struct SubmitItemData {
    pub existing_tags: Vec<Tag>,
    pub fresh_tag_ids: Vec<String>, // Pre-generated UUIDs for new tags
}





#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema, HoratioElm)]
pub struct SubmitItemRes {
    pub item: MicroblogItem,
}

// --- Session Slices ---

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
pub struct ServerContext {
    pub request_id: String,
    pub session_id: Option<String>,
    pub user_id: Option<String>,
    pub host: String,
}



#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
pub enum BackendAction {
    SubmitItem(SubmitItemReqBundle),
    SubmitComment(SubmitCommentReqBundle),
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
pub enum BackendEffect {
    Insert { table: String, data: String }, // Using String for JSON data to simplify Elm generation for now
    Log(String),
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, HoratioElm)]
pub struct BackendOutput {
    pub effects: Vec<BackendEffect>,
    pub response: Option<String>, // JSON string for response
    pub error: Option<String>,
}

// Deprecated: Replaced by BackendOutput
// #[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
// pub enum BackendResult {
//     SubmitItemSuccess(MicroblogItem),
//     Error(String),
// }

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode, ToSchema, HoratioElm)]
pub struct SubmitCommentRes {
    pub comment: ItemComment,
}
