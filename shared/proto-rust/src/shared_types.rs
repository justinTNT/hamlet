use serde::{Serialize, Deserialize};
use elm_rs::{Elm, ElmEncode, ElmDecode};

// --- API Error Definition ---
#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
#[serde(tag = "type")]
pub enum ApiError {
    ValidationError { details: String },
    NotFound { details: String },
    InternalError { details: String },
}

// --- Generic API Response Wrapper ---
#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
#[serde(untagged)]
pub enum ApiResponse<T> {
    Success(T),
    Error(ApiError),
}

// --- Data Models ---

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct MicroblogItem {
    pub id: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
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

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct GetFeedReq {
    pub host: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct GetFeedRes {
    pub items: Vec<MicroblogItem>,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
pub struct SubmitItemReq {
    pub host: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
}

#[derive(Serialize, Deserialize, Debug, Elm, ElmEncode, ElmDecode)]
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
