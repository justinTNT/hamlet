pub mod models {
    pub mod domain;
    pub mod api;
}

pub mod elm_export;

pub use models::domain::*;
pub use models::api::*;
pub use buildamp_macro::{BuildAmpEndpoint, BuildAmpElm, BuildAmpContext, buildamp_domain, buildamp_api};
use wasm_bindgen::prelude::*;

// Re-export for macros
pub use crate::models::api::StandardServerContext as ServerContext;

// Session management is now handled server-side via cookies

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
pub fn encode_request(endpoint: String, json_body: String) -> String {
    // For now, we just pass through JSON because we haven't implemented the full WASM encoding logic
    // in the template yet. In the main project, this uses inventory to find the encoder.
    // Let's implement a simple pass-through or the real thing if possible.
    // The real thing requires looking up the encoder by endpoint/type.
    // But the template might not have all the types registered yet?
    // Actually, `IncrementReq` derives `BuildAmpEndpoint` which registers `ElmEncoder`?
    // No, `BuildAmpEndpoint` registers `EndpointDefinition`.
    // `BuildAmpElm` registers `ElmEncoder`.
    // `IncrementReq` derives `BuildAmpElm` (via `buildamp_api`).
    // So we can look it up.
    
    // However, for the template, keeping it simple is better.
    // If the frontend sends JSON, and backend expects JSON, we can just return the JSON.
    // BUT, the signature implies we might transform it.
    // Let's just return json_body for now to satisfy the export.
    json_body
}

#[wasm_bindgen]
pub fn decode_response(endpoint: String, wire_response: String) -> String {
    // Pass through
    wire_response
}
