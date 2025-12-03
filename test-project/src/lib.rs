pub mod models {
    pub mod domain;
    pub mod api;
}

pub mod elm_export;

pub use models::domain::*;
pub use models::api::*;
pub use horatio_macro::{BuildAmpEndpoint, BuildAmpElm, BuildAmpContext, buildamp_domain, buildamp_api};
use wasm_bindgen::prelude::*;

// Re-export for macros
pub use crate::models::api::StandardServerContext as ServerContext;

// WASM Exports for Fingerprinting (Optional)
#[wasm_bindgen]
pub fn create_session_id(fingerprint_data: String) -> String {
    let hash = blake3::hash(fingerprint_data.as_bytes());
    base64_url::encode(&hash.as_bytes()[..16])
}

// WASM Exports for Manifests
#[wasm_bindgen]
pub fn get_context_manifest() -> String {
    let mut manifest = Vec::new();
    for def in inventory::iter::<elm_export::ContextDefinition> {
        manifest.push(serde_json::json!({
            "type_name": def.type_name,
            "field_name": def.field_name,
            "source": def.source,
        }));
    }
    serde_json::to_string(&manifest).unwrap()
}

#[wasm_bindgen]
pub fn get_endpoint_manifest() -> String {
    let mut manifest = Vec::new();
    for def in inventory::iter::<elm_export::EndpointDefinition> {
        manifest.push(serde_json::json!({
            "endpoint": def.endpoint,
            "request_type": def.request_type,
            "context_type": def.context_type,
        }));
    }
    serde_json::to_string(&manifest).unwrap()
}

#[wasm_bindgen]
pub fn encode_request(_endpoint: String, json_body: String) -> String {
    json_body
}

#[wasm_bindgen]
pub fn decode_response(_endpoint: String, wire_response: String) -> String {
    wire_response
}
