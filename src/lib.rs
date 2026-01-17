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
    pub mod validation_types;
    pub mod validation_aliases;
    pub mod rich_content;
}

// Auto-discover all models - no manual declarations needed!
pub mod models {
    use super::*;
    use buildamp_macro::buildamp_auto_discover_models;
    buildamp_auto_discover_models!();
}

// Auto-discovery macro generates all model modules and exports

pub use framework::common::*;
pub use framework::database_types::*;
pub use framework::event_types::*;
pub use framework::validation_types::*;
pub use framework::validation_aliases::*;

// Note: Removing legacy re-exports to avoid ambiguous imports
// Legacy modules still available via explicit paths (models::comments::* etc.)
pub mod elm_export;
pub use buildamp_macro::{BuildAmpEndpoint, BuildAmpElm, BuildAmpContext};

// Note: encode_request/encode_response removed - WASM codec layer cancelled
// Validation now happens in Elm via generated JSON decoders

pub fn get_context_manifest() -> String {
    match get_context_manifest_result() {
        Ok(json) => json,
        Err(error) => {
            eprintln!("[BuildAmp] Context manifest error: {}", error);
            serde_json::json!({
                "error": "Failed to generate context manifest",
                "details": error,
                "contexts": []
            }).to_string()
        }
    }
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

pub fn get_endpoint_manifest() -> String {
    match get_endpoint_manifest_result() {
        Ok(json) => json,
        Err(error) => {
            eprintln!("[BuildAmp] Endpoint manifest error: {}", error);
            serde_json::json!({
                "error": "Failed to generate endpoint manifest", 
                "details": error,
                "endpoints": []
            }).to_string()
        }
    }
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

pub fn validate_manifest() -> String {
    let mut errors: Vec<String> = Vec::new();
    let mut contexts: Vec<serde_json::Value> = Vec::new();
    let mut endpoints: Vec<serde_json::Value> = Vec::new();

    // Validate context manifest
    match get_context_manifest_result() {
        Ok(context_json) => {
            if let Ok(parsed) = serde_json::from_str::<Vec<serde_json::Value>>(&context_json) {
                contexts = parsed;
            }
        }
        Err(error) => {
            errors.push(format!("Context manifest: {}", error));
        }
    }

    // Validate endpoint manifest
    match get_endpoint_manifest_result() {
        Ok(endpoint_json) => {
            if let Ok(parsed) = serde_json::from_str::<Vec<serde_json::Value>>(&endpoint_json) {
                endpoints = parsed;
            }
        }
        Err(error) => {
            errors.push(format!("Endpoint manifest: {}", error));
        }
    }

    serde_json::json!({
        "valid": errors.is_empty(),
        "contexts": contexts,
        "endpoints": endpoints,
        "errors": errors
    }).to_string()
}

pub fn generate_migrations() -> String {
    framework::migration_gen::generate_migration_sql()
}

// Infrastructure functions removed - not used in the codebase
// These were legacy WASM exports that are no longer needed

// Response decoder is auto-generated by buildamp_auto_discover_models! macro
// No hardcoded models needed
