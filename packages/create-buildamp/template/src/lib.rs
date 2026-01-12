use wasm_bindgen::prelude::*;
extern crate self as proto_rust;
use serde_json;

pub mod framework {
    pub mod common;
    pub mod database_types;
    pub mod storage_types;
    pub mod event_types;
    pub mod migration_gen;
    pub mod database_infrastructure;
    pub mod core;
}


// Auto-discover all models - no manual declarations needed!
pub mod models {
    use super::*;
    use buildamp_macro::buildamp_auto_discover_models;
    buildamp_auto_discover_models!();
}

pub mod elm_export;
pub use buildamp_macro::{BuildAmpEndpoint, BuildAmpElm, BuildAmpContext};

pub use framework::common::*;
pub use framework::database_types::*;
pub use framework::event_types::*;

#[wasm_bindgen]
pub fn encode_request(_endpoint: String, json_in: String) -> String {
    // Client-side: Encode Elm request -> Wire JSON
    json_in
}

#[wasm_bindgen]
pub fn dispatcher(endpoint: String, wire: String, context_json: String) -> String {
    use buildamp_macro::generate_dispatcher;
    // Deserialize context or use default if empty/error
    let context: Context = serde_json::from_str(&context_json).unwrap_or_default();
    
    // Example: The dispatcher macro will handle routing based on your API models
    generate_dispatcher!(
        (models::api::HelloReq, models::api::HelloRes)
        // Add more API endpoints here as you define them
    )
}

#[wasm_bindgen]
pub fn get_openapi_spec() -> String {
    use buildamp_macro::generate_openapi_spec;
    // Example: The OpenAPI spec is auto-generated from your API models
    generate_openapi_spec!(
        (models::api::HelloReq, models::api::HelloRes)
        // Add more API endpoints here as you define them
    );
    get_openapi_spec()
}

#[wasm_bindgen]
pub fn encode_response(_endpoint: String, json_in: String) -> String {
    json_in
}
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
pub fn validate_manifest() -> String {
    let mut report = Vec::new();
    let mut has_errors = false;

    // Validate context manifest
    match get_context_manifest_result() {
        Ok(context_json) => {
            if let Ok(contexts) = serde_json::from_str::<Vec<serde_json::Value>>(&context_json) {
                report.push(format!("✅ Context Manifest: {} contexts loaded", contexts.len()));
                for context in &contexts {
                    if let Some(source) = context.get("source").and_then(|v| v.as_str()) {
                        if let Some(type_name) = context.get("type").and_then(|v| v.as_str()) {
                            report.push(format!("   📋 {} -> {}", type_name, source));
                        }
                    }
                }
            }
        }
        Err(error) => {
            has_errors = true;
            report.push(format!("❌ Context Manifest: {}", error));
        }
    }

    // Validate endpoint manifest  
    match get_endpoint_manifest_result() {
        Ok(endpoint_json) => {
            if let Ok(endpoints) = serde_json::from_str::<Vec<serde_json::Value>>(&endpoint_json) {
                report.push(format!("✅ Endpoint Manifest: {} endpoints loaded", endpoints.len()));
                for endpoint in &endpoints {
                    if let (Some(path), Some(req_type)) = (
                        endpoint.get("endpoint").and_then(|v| v.as_str()),
                        endpoint.get("request_type").and_then(|v| v.as_str())
                    ) {
                        report.push(format!("   🔌 {} -> {}", path, req_type));
                    }
                }
            }
        }
        Err(error) => {
            has_errors = true;
            report.push(format!("❌ Endpoint Manifest: {}", error));
        }
    }

    let status = if has_errors { "❌ VALIDATION FAILED" } else { "✅ VALIDATION PASSED" };
    report.insert(0, format!("[BuildAmp] Manifest Validation"));
    report.insert(1, format!("Status: {}", status));
    report.push(String::new());

    report.join("\n")
}

fn get_context_manifest_result() -> Result<String, String> {
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
    
    serde_json::to_string(&definitions)
        .map_err(|e| format!("JSON serialization failed: {}", e))
}

fn get_endpoint_manifest_result() -> Result<String, String> {
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
    
    // Check for duplicate endpoints
    validate_unique_endpoints(&definitions)?;
    
    serde_json::to_string(&definitions)
        .map_err(|e| format!("JSON serialization failed: {}", e))
}

fn validate_unique_endpoints(definitions: &[serde_json::Value]) -> Result<(), String> {
    let mut seen_endpoints = std::collections::HashMap::new();
    
    for def in definitions {
        if let Some(endpoint) = def.get("endpoint").and_then(|v| v.as_str()) {
            if let Some(existing_type) = seen_endpoints.get(endpoint) {
                let current_type = def.get("request_type").and_then(|v| v.as_str()).unwrap_or("Unknown");
                return Err(format!(
                    "Duplicate endpoint '{}' found in both {} and {}. Please rename one of them.",
                    endpoint, existing_type, current_type
                ));
            }
            seen_endpoints.insert(endpoint, def.get("request_type").and_then(|v| v.as_str()).unwrap_or("Unknown"));
        }
    }
    
    Ok(())
}

#[wasm_bindgen] 
pub fn generate_migrations() -> String {
    framework::migration_gen::generate_migration_sql()
}

// Infrastructure functions removed - not used in the codebase

#[wasm_bindgen]
pub fn decode_response(_endpoint: String, wire: String) -> String {
    // Client-side validation will be auto-generated when you add API models
    // For now, just pass through
    wire
}
