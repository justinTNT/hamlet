use wasm_bindgen::prelude::*;
extern crate self as proto_rust;
use serde_json;

pub mod models {
    pub mod common;
    pub mod identity;
    pub mod tags;
    pub mod comments;
    pub mod feed;
    pub mod fingerprint;
}
pub use models::common::*;
pub use models::identity::*;
pub use models::tags::*;
pub use models::comments::*;
pub use models::feed::*;
pub mod fingerprint {
    pub use crate::models::fingerprint::*;
}
pub use fingerprint::*;

pub mod elm_export;
pub use horatio_macro::{HoratioEndpoint, HoratioElm, HoratioContext};

#[wasm_bindgen]
pub fn create_session_id(fingerprint_data: String) -> String {
    models::fingerprint::generate_fingerprint(fingerprint_data)
}

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
pub fn get_context_manifest() -> String {
    let definitions: Vec<serde_json::Value> = inventory::iter::<elm_export::ContextDefinition>
        .into_iter()
        .map(|def| {
            serde_json::json!({
                "type": def.type_name,
                "field": def.field_name,
                "source": def.source
            })
        })
        .collect();
    serde_json::to_string(&definitions).unwrap_or_else(|_| "[]".to_string())
}

#[wasm_bindgen]
pub fn get_endpoint_manifest() -> String {
    let definitions: Vec<serde_json::Value> = inventory::iter::<elm_export::EndpointDefinition>
        .into_iter()
        .map(|def| {
            serde_json::json!({
                "endpoint": def.endpoint,
                "request_type": def.request_type,
                "context_type": def.context_type
            })
        })
        .collect();
    serde_json::to_string(&definitions).unwrap_or_else(|_| "[]".to_string())
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
