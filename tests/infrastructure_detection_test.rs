// Test for infrastructure detection system
use proto_rust::*;

#[test]
fn test_infrastructure_detection_with_events() {
    // Since we have src/models/events/send_welcome_email.rs, 
    // the auto-discovery should detect events and require infrastructure
    let requires_infra = requires_events_infrastructure();
    println!("Requires events infrastructure: {}", requires_infra);
    
    // Should be true because we have events models
    assert!(requires_infra, "Should detect events models and require infrastructure");
}

#[test]
fn test_events_infrastructure_sql_generation() {
    // Test that we can get the SQL for events infrastructure
    let sql = get_events_infrastructure_sql();
    
    println!("Events infrastructure SQL:\n{}", sql);
    
    // Should contain the events table with session_id
    assert!(sql.contains("buildamp_events"), "Should create buildamp_events table");
    assert!(sql.contains("session_id TEXT"), "Should include session_id column");
    assert!(sql.contains("idx_buildamp_events_session"), "Should create session index");
    assert!(sql.contains("correlation_id"), "Should include correlation_id for tracing");
    
    // Should include schema versioning
    assert!(sql.contains("buildamp_schema_info"), "Should create schema info table");
}

#[test]
fn test_infrastructure_manifest() {
    let manifest_json = get_infrastructure_manifest();
    
    println!("Infrastructure manifest:\n{}", manifest_json);
    
    // Parse the JSON to verify structure
    let manifest: serde_json::Value = serde_json::from_str(&manifest_json)
        .expect("Manifest should be valid JSON");
    
    // Should contain events table info
    assert!(manifest["events_table"].is_object(), "Should have events_table info");
    assert_eq!(manifest["events_table"]["name"], "buildamp_events");
    
    // Should contain installation info
    assert!(manifest["installation"].is_object(), "Should have installation info");
    assert_eq!(manifest["installation"]["trigger"], "Detection of src/models/events/ directory with files");
    assert_eq!(manifest["installation"]["philosophy"], "Infrastructure follows intent");
}

#[test]
fn test_events_table_schema_features() {
    let sql = get_events_infrastructure_sql();
    
    // Verify all the key features of the events table
    let expected_columns = vec![
        "id UUID PRIMARY KEY",
        "session_id TEXT",
        "application TEXT",
        "host TEXT", 
        "stream_id TEXT",
        "event_type TEXT",
        "correlation_id UUID",
        "payload JSONB",
        "execute_at TIMESTAMP",
        "context JSONB",
        "status TEXT",
        "created_at TIMESTAMP",
        "attempts INTEGER",
        "max_attempts INTEGER",
        "next_retry_at TIMESTAMP",
        "error_message TEXT",
        "priority TEXT"
    ];
    
    for column in expected_columns {
        assert!(sql.contains(column), "Should contain column: {}", column);
    }
    
    // Verify indexes for performance
    let expected_indexes = vec![
        "idx_buildamp_events_session",  // For session targeting
        "idx_buildamp_events_queue",    // For queue processing  
        "idx_buildamp_events_correlation" // For tracing
    ];
    
    for index in expected_indexes {
        assert!(sql.contains(index), "Should contain index: {}", index);
    }
}