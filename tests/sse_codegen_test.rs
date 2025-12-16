// Test for SSE codegen functionality with naked structs
use serde_json;

// Test naked SSE structures for auto-discovery
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TestPostEvent {
    pub post_id: String,
    pub title: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TestCommentEvent {
    pub comment_id: String,
    pub post_id: String,
    pub text: String,
    pub timestamp: i64,
}

#[test]
fn test_sse_codegen_serialization() {
    // Test that naked SSE structs serialize properly
    let test_post = TestPostEvent {
        post_id: "test_123".to_string(),
        title: "Test Post".to_string(),
        timestamp: 1703123456789,
    };

    // Should serialize as a simple object without wrappers
    let json = serde_json::to_string(&test_post).expect("Failed to serialize TestPostEvent");
    println!("Serialized: {}", json);
    
    // Should deserialize back properly
    let deserialized: TestPostEvent = serde_json::from_str(&json).expect("Failed to deserialize TestPostEvent");
    assert_eq!(deserialized.post_id, "test_123");
    assert_eq!(deserialized.title, "Test Post");
    assert_eq!(deserialized.timestamp, 1703123456789);
}

#[test] 
fn test_sse_codegen_json_format() {
    let test_comment = TestCommentEvent {
        comment_id: "comment_456".to_string(),
        post_id: "post_123".to_string(),
        text: "Great post!".to_string(),
        timestamp: 1703123456890,
    };

    let json = serde_json::to_string(&test_comment).expect("Failed to serialize TestCommentEvent");
    println!("Comment JSON: {}", json);
    
    // Parse as generic JSON to verify simple structure
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse JSON");
    
    // Should be a simple flat object without wrappers
    assert!(parsed.is_object());
    assert_eq!(parsed["comment_id"], "comment_456");
    assert_eq!(parsed["post_id"], "post_123");  
    assert_eq!(parsed["text"], "Great post!");
    assert_eq!(parsed["timestamp"], 1703123456890_i64);
    
    // No wrapper fields should exist
    assert!(!parsed.as_object().unwrap().contains_key("type"));
    assert!(!parsed.as_object().unwrap().contains_key("data"));
    
    // Test round-trip
    let deserialized: TestCommentEvent = serde_json::from_str(&json).expect("Failed to deserialize");
    assert_eq!(deserialized.comment_id, "comment_456");
    assert_eq!(deserialized.post_id, "post_123");
    assert_eq!(deserialized.text, "Great post!");
    assert_eq!(deserialized.timestamp, 1703123456890);
}