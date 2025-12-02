use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_json;
use utoipa::OpenApi;

mod shared_types;
pub use shared_types::*;
pub use horatio_macro::HoratioEndpoint;

#[wasm_bindgen]
pub fn encode_request(_endpoint: String, json_in: String) -> String {
    // Client-side: Encode Elm request -> Wire JSON
    json_in
}

#[wasm_bindgen]
pub fn dispatcher(endpoint: String, wire: String, context_json: String) -> String {
    use horatio_macro::generate_dispatcher;
    // Deserialize context or use default if empty/error
    let context: Context = serde_json::from_str(&context_json).unwrap_or_default();
    generate_dispatcher!(
        (GetFeedReq, GetFeedRes), 
        (GetTagsReq, GetTagsRes), 
        (SubmitItemReq, SubmitItemRes),
        (SubmitCommentReq, SubmitCommentRes)
    )
}

#[wasm_bindgen]
pub fn get_openapi_spec() -> String {
    use horatio_macro::generate_openapi_spec;
    generate_openapi_spec!(
        (GetFeedReq, GetFeedRes), 
        (GetTagsReq, GetTagsRes), 
        (SubmitItemReq, SubmitItemRes),
        (SubmitCommentReq, SubmitCommentRes),
        MicroblogItem,
        Tag
    );
    get_openapi_spec()
}

#[wasm_bindgen]
pub fn encode_response(_endpoint: String, json_in: String) -> String {
    json_in
}

#[wasm_bindgen]
pub fn decode_response(endpoint: String, wire: String) -> String {
    // Client-side validation could go here
    if endpoint == "GetFeed" {
         if let Ok(_) = serde_json::from_str::<GetFeedRes>(&wire) {
             return wire;
         }
    }
    if endpoint == "GetTags" {
         if let Ok(_) = serde_json::from_str::<GetTagsRes>(&wire) {
             return wire;
         }
    }
    if endpoint == "SubmitItem" {
         if let Ok(_) = serde_json::from_str::<SubmitItemRes>(&wire) {
             return wire;
         }
    }
    
    // Pass through or generic error check
    wire
}