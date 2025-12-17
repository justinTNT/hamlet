// Test for SSEEffect framework types and session-aware functionality
use proto_rust::framework::event_types::SSEEffect;
use serde_json;

#[test]
fn test_sse_effect_send_to_session() {
    // Test creating a session-targeted SSE effect
    let effect = SSEEffect::send_to_session("session_123", "user_joined", r#"{"user_id": "user_456"}"#.to_string());
    
    // Verify the structure
    match &effect {
        SSEEffect::SendToSession { session_id, event_type, data } => {
            assert_eq!(session_id, "session_123");
            assert_eq!(event_type, "user_joined");
            assert_eq!(data, r#"{"user_id": "user_456"}"#);
        }
        _ => panic!("Expected SendToSession variant"),
    }
    
    // Test serialization
    let json = serde_json::to_string(&effect).expect("Should serialize SSEEffect");
    println!("SendToSession JSON: {}", json);
    
    // Test deserialization
    let deserialized: SSEEffect = serde_json::from_str(&json).expect("Should deserialize SSEEffect");
    match deserialized {
        SSEEffect::SendToSession { session_id, event_type, data } => {
            assert_eq!(session_id, "session_123");
            assert_eq!(event_type, "user_joined");
            assert_eq!(data, r#"{"user_id": "user_456"}"#);
        }
        _ => panic!("Deserialization failed"),
    }
}

#[test]
fn test_sse_effect_send_to_multiple_sessions() {
    // Test multi-session targeting
    let sessions = vec![
        "session_1".to_string(),
        "session_2".to_string(), 
        "session_3".to_string()
    ];
    let effect = SSEEffect::send_to_sessions(
        sessions.clone(), 
        "batch_update", 
        r#"{"type": "notification", "message": "System update"}"#.to_string()
    );
    
    // Verify the structure
    match &effect {
        SSEEffect::SendToSessions { session_ids, event_type, data } => {
            assert_eq!(session_ids, &sessions);
            assert_eq!(event_type, "batch_update");
            assert_eq!(data, r#"{"type": "notification", "message": "System update"}"#);
        }
        _ => panic!("Expected SendToSessions variant"),
    }
    
    // Test serialization roundtrip
    let json = serde_json::to_string(&effect).expect("Should serialize multi-session effect");
    println!("SendToSessions JSON: {}", json);
    
    let deserialized: SSEEffect = serde_json::from_str(&json).expect("Should deserialize multi-session effect");
    match deserialized {
        SSEEffect::SendToSessions { session_ids, event_type, data: _ } => {
            assert_eq!(session_ids.len(), 3);
            assert!(session_ids.contains(&"session_1".to_string()));
            assert!(session_ids.contains(&"session_2".to_string()));
            assert!(session_ids.contains(&"session_3".to_string()));
            assert_eq!(event_type, "batch_update");
        }
        _ => panic!("Multi-session deserialization failed"),
    }
}

#[test]
fn test_sse_effect_broadcast_to_tenant() {
    // Test tenant-wide broadcasting
    let effect = SSEEffect::broadcast_to_tenant(
        "global_announcement", 
        r#"{"title": "Maintenance", "message": "System will be down for 5 minutes"}"#.to_string()
    );
    
    // Verify the structure
    match &effect {
        SSEEffect::BroadcastToTenant { event_type, data } => {
            assert_eq!(event_type, "global_announcement");
            assert_eq!(data, r#"{"title": "Maintenance", "message": "System will be down for 5 minutes"}"#);
        }
        _ => panic!("Expected BroadcastToTenant variant"),
    }
    
    // Test serialization roundtrip
    let json = serde_json::to_string(&effect).expect("Should serialize broadcast effect");
    println!("BroadcastToTenant JSON: {}", json);
    
    let deserialized: SSEEffect = serde_json::from_str(&json).expect("Should deserialize broadcast effect");
    match deserialized {
        SSEEffect::BroadcastToTenant { event_type, data } => {
            assert_eq!(event_type, "global_announcement");
            assert!(data.contains("Maintenance"));
        }
        _ => panic!("Broadcast deserialization failed"),
    }
}

#[test]
fn test_sse_effect_helper_methods() {
    // Test that helper methods work with Into<String> types
    let effect1 = SSEEffect::send_to_session("session", "event", "data".to_string());
    let effect2 = SSEEffect::send_to_session("session".to_string(), "event".to_string(), "data".to_string());
    
    // Both should create the same effect
    let json1 = serde_json::to_string(&effect1).expect("Should serialize");
    let json2 = serde_json::to_string(&effect2).expect("Should serialize");
    assert_eq!(json1, json2);
    
    // Test with &str inputs
    let effect3 = SSEEffect::send_to_sessions(
        vec!["s1".to_string(), "s2".to_string()],
        "test",
        "payload".to_string()
    );
    
    // Test with String inputs  
    let effect4 = SSEEffect::send_to_sessions(
        vec!["s1".to_string(), "s2".to_string()],
        "test".to_string(),
        "payload".to_string()
    );
    
    let json3 = serde_json::to_string(&effect3).expect("Should serialize");
    let json4 = serde_json::to_string(&effect4).expect("Should serialize");
    assert_eq!(json3, json4);
}

#[test] 
fn test_sse_effect_empty_sessions() {
    // Test edge case: empty session list
    let effect = SSEEffect::send_to_sessions(
        vec![], 
        "empty_test", 
        "{}".to_string()
    );
    
    match &effect {
        SSEEffect::SendToSessions { session_ids, event_type, data } => {
            assert_eq!(session_ids.len(), 0);
            assert_eq!(event_type, "empty_test");
            assert_eq!(data, "{}");
        }
        _ => panic!("Expected SendToSessions variant"),
    }
    
    // Should still serialize/deserialize properly
    let json = serde_json::to_string(&effect).expect("Should serialize empty sessions");
    println!("Empty sessions JSON: {}", json);
    
    let deserialized: SSEEffect = serde_json::from_str(&json).expect("Should deserialize empty sessions");
    match deserialized {
        SSEEffect::SendToSessions { session_ids, .. } => {
            assert_eq!(session_ids.len(), 0);
        }
        _ => panic!("Empty sessions deserialization failed"),
    }
}

#[test]
fn test_sse_effect_json_data_handling() {
    // Test with complex JSON data
    let complex_data = r#"{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}], "metadata": {"timestamp": 1640995200, "source": "api"}}"#;
    
    let effect = SSEEffect::send_to_session("session_complex", "data_update", complex_data.to_string());
    
    // Should handle complex JSON without issues
    let json = serde_json::to_string(&effect).expect("Should serialize complex data");
    println!("Complex data JSON: {}", json);
    
    let deserialized: SSEEffect = serde_json::from_str(&json).expect("Should deserialize complex data");
    match deserialized {
        SSEEffect::SendToSession { data, .. } => {
            // Verify the JSON structure is preserved
            let parsed: serde_json::Value = serde_json::from_str(&data).expect("Data should be valid JSON");
            assert_eq!(parsed["users"][0]["name"], "Alice");
            assert_eq!(parsed["metadata"]["source"], "api");
        }
        _ => panic!("Complex data deserialization failed"),
    }
}

#[test]
fn test_sse_effect_elm_compatibility() {
    // Test that SSEEffect produces Elm-compatible JSON
    let effects = vec![
        SSEEffect::send_to_session("s1", "test1", "{}".to_string()),
        SSEEffect::send_to_sessions(vec!["s2".to_string(), "s3".to_string()], "test2", "{}".to_string()),
        SSEEffect::broadcast_to_tenant("test3", "{}".to_string()),
    ];
    
    for (i, effect) in effects.iter().enumerate() {
        let json = serde_json::to_string(effect).expect("Should serialize for Elm");
        println!("Elm effect {}: {}", i, json);
        
        // Parse as generic JSON to verify structure
        let parsed: serde_json::Value = serde_json::from_str(&json).expect("Should parse as JSON");
        assert!(parsed.is_object());
        
        // Should be properly tagged for Elm union types (Rust enum serialization)
        match effect {
            SSEEffect::SendToSession { .. } => {
                assert!(parsed.as_object().unwrap().contains_key("SendToSession"));
                let inner = &parsed["SendToSession"];
                assert!(inner.as_object().unwrap().contains_key("session_id"));
                assert!(inner.as_object().unwrap().contains_key("event_type"));
                assert!(inner.as_object().unwrap().contains_key("data"));
            }
            SSEEffect::SendToSessions { .. } => {
                assert!(parsed.as_object().unwrap().contains_key("SendToSessions"));
                let inner = &parsed["SendToSessions"];
                assert!(inner.as_object().unwrap().contains_key("session_ids"));
                assert!(inner.as_object().unwrap().contains_key("event_type"));
                assert!(inner.as_object().unwrap().contains_key("data"));
            }
            SSEEffect::BroadcastToTenant { .. } => {
                assert!(parsed.as_object().unwrap().contains_key("BroadcastToTenant"));
                let inner = &parsed["BroadcastToTenant"];
                assert!(inner.as_object().unwrap().contains_key("event_type"));
                assert!(inner.as_object().unwrap().contains_key("data"));
                assert!(!inner.as_object().unwrap().contains_key("session_id"));
                assert!(!inner.as_object().unwrap().contains_key("session_ids"));
            }
        }
    }
}