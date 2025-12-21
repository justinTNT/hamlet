
use buildamp_macro::buildamp_auto_discover_models;

// Mock framework dependencies for testing
pub mod framework {
    pub mod database_infrastructure {
        use std::collections::HashMap;
        use serde_json::Value;
        
        pub struct DatabaseInfrastructure;
        
        impl DatabaseInfrastructure {
            pub fn get_events_table_sql() -> &'static str {
                "-- Mock events table SQL"
            }
            
            pub fn generate_infrastructure_manifest() -> HashMap<String, Value> {
                HashMap::new()
            }
        }
    }
}

// Mock required traits and context
pub mod elm_export {
    pub struct EndpointDefinition {
        pub endpoint: &'static str,
        pub request_type: &'static str,
        pub context_type: Option<&'static str>,
    }
    
    pub struct ElmDefinition {
        pub name: &'static str,
        pub get_def: fn() -> String,
    }
    
    pub struct ElmEncoder {
        pub name: &'static str,
        pub get_enc: fn() -> String,
    }
    
    pub struct ElmDecoder {
        pub name: &'static str,
        pub get_dec: fn() -> String,
    }
    
    pub struct ContextDefinition {
        pub type_name: &'static str,
        pub field_name: &'static str,
        pub source: &'static str,
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct Context {
    pub user_id: Option<String>,
    pub is_extension: bool,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ServerContext {
    pub user_id: Option<String>,
}

// Mock BuildAmp traits
pub trait BuildAmpElm {}
impl<T> BuildAmpElm for T {}

pub trait BuildAmpEndpoint {}
impl<T> BuildAmpEndpoint for T {}

pub trait BuildAmpContext {}
impl<T> BuildAmpContext for T {}

buildamp_auto_discover_models!();
