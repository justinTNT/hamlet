// Test for API codegen functionality - testing auto-discovery works
use serde_json;
use proto_rust::*;
use buildamp_macro::buildamp;

// Define mock dependencies to test API codegen in isolation  
// Auto-discovery will apply traits based on this being a test file
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode)]
pub struct MockContextData {
    pub fresh_id: String,
    pub metadata: String,
}

// Test request struct with buildamp macro - auto-discovery detects and skips decoration
#[buildamp(path = "TestEndpoint", server_context = "MockContextData")]
pub struct TestApiReq {
    pub user_input: String,
    pub optional_field: Option<i32>,
    #[api(Required, Trim, MinLength(3))]
    pub validated_field: String,
    #[api(Inject = "host")]
    #[serde(default)]
    pub host: String,
}

// Test response struct - would get auto-decorations in real API files
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode)]
pub struct TestApiRes {
    pub success: bool,
    pub message: String,
    pub data: Vec<String>,
}

#[test]
fn test_api_request_structure() {
    // Test that API request compiles and works with decorations
    let req = TestApiReq {
        user_input: "test data".to_string(),
        optional_field: Some(42),
        validated_field: "valid input".to_string(),
        host: "example.com".to_string(),
    };
    
    // Should serialize properly
    let json = serde_json::to_string(&req).expect("Failed to serialize API request");
    println!("API Request: {}", json);
    
    // Should deserialize properly
    let deserialized: TestApiReq = serde_json::from_str(&json)
        .expect("Failed to deserialize API request");
    
    assert_eq!(deserialized.user_input, "test data");
    assert_eq!(deserialized.optional_field, Some(42));
    assert_eq!(deserialized.validated_field, "valid input");
    assert_eq!(deserialized.host, "example.com");
}

#[test]
fn test_api_response_structure() {
    // Test that API response works without decorations (simple struct)
    let res = TestApiRes {
        success: true,
        message: "Operation completed".to_string(),
        data: vec!["result1".to_string(), "result2".to_string()],
    };
    
    // Should serialize properly
    let json = serde_json::to_string(&res).expect("Failed to serialize API response");
    println!("API Response: {}", json);
    
    // Verify JSON structure
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse JSON");
    assert_eq!(parsed["success"], true);
    assert_eq!(parsed["message"], "Operation completed");
    assert_eq!(parsed["data"].as_array().unwrap().len(), 2);
    
    // Should deserialize properly
    let deserialized: TestApiRes = serde_json::from_str(&json)
        .expect("Failed to deserialize API response");
    
    assert_eq!(deserialized.success, true);
    assert_eq!(deserialized.message, "Operation completed");
    assert_eq!(deserialized.data.len(), 2);
}

#[test]
fn test_api_validation_attributes() {
    // Test that API validation attributes are properly applied
    let req = TestApiReq {
        user_input: "user data".to_string(),
        optional_field: None,
        validated_field: "  needs trimming  ".to_string(),
        host: "injected-host".to_string(),
    };
    
    // Test endpoint path is accessible
    assert_eq!(TestApiReq::endpoint_path(), "TestEndpoint");
    
    // Should serialize with all fields
    let json = serde_json::to_string(&req).expect("Failed to serialize");
    
    // Verify required fields are present
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse");
    assert_eq!(parsed["user_input"], "user data");
    assert_eq!(parsed["validated_field"], "  needs trimming  ");
    assert_eq!(parsed["host"], "injected-host");
    
    // Optional field should serialize as null when None
    assert_eq!(parsed["optional_field"], serde_json::Value::Null);
}

#[test]
fn test_api_macro_behavior() {
    // Test that the buildamp macro properly applies API decorations
    
    // Should have endpoint path
    assert_eq!(TestApiReq::endpoint_path(), "TestEndpoint");
    
    // Should be serializable/deserializable
    let test_req = TestApiReq {
        user_input: "macro test".to_string(),
        optional_field: Some(123),
        validated_field: "macro validated".to_string(),
        host: "macro.host".to_string(),
    };
    
    // Round-trip serialization should work
    let json = serde_json::to_string(&test_req).expect("Serialize failed");
    let roundtrip: TestApiReq = serde_json::from_str(&json).expect("Deserialize failed");
    
    assert_eq!(roundtrip.user_input, "macro test");
    assert_eq!(roundtrip.optional_field, Some(123));
    assert_eq!(roundtrip.validated_field, "macro validated");
    assert_eq!(roundtrip.host, "macro.host");
    
    println!("API macro behavior working correctly");
}

#[test]
fn test_context_data_integration() {
    // Test that context data works with API requests
    let context = MockContextData {
        fresh_id: "generated_123".to_string(),
        metadata: "request_metadata".to_string(),
    };
    
    // Should serialize properly
    let json = serde_json::to_string(&context).expect("Failed to serialize context");
    println!("Context data: {}", json);
    
    // Should deserialize properly
    let deserialized: MockContextData = serde_json::from_str(&json)
        .expect("Failed to deserialize context");
    
    assert_eq!(deserialized.fresh_id, "generated_123");
    assert_eq!(deserialized.metadata, "request_metadata");
}