use serde::{Serialize, Deserialize};
use elm_rs::{Elm, ElmEncode, ElmDecode};
use horatio_macro::buildamp_domain;

// --- API Error Definition ---
#[buildamp_domain]
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

// --- Session Slices ---
#[buildamp_domain]
pub struct StandardServerContext {
    pub request_id: String,
    pub session_id: Option<String>,
    pub user_id: Option<String>,
    pub host: String,
}

pub type ServerContext = StandardServerContext;

// --- Effects ---
// We need to forward declare the bundles or use a generic approach if we want to avoid circular deps,
// but BackendAction depends on specific bundles.
// For now, we will import them.
use crate::models::feed::SubmitItemReqBundle;
use crate::models::comments::SubmitCommentReqBundle;

#[buildamp_domain]
pub enum BackendAction {
    SubmitItem(SubmitItemReqBundle),
    SubmitComment(SubmitCommentReqBundle),
}

#[buildamp_domain]
pub enum BackendEffect {
    Insert { table: String, data: String },
    Log(String),
}

#[buildamp_domain]
pub struct BackendOutput {
    pub effects: Vec<BackendEffect>,
    pub response: Option<String>,
    pub error: Option<String>,
}
