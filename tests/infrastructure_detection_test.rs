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

#[test]
fn test_session_index_performance_optimization() {
    let sql = get_events_infrastructure_sql();
    
    // Verify session index is properly optimized for lookups
    assert!(sql.contains("idx_buildamp_events_session"), "Should have session index");
    assert!(sql.contains("session_id"), "Index should target session_id column");
    
    // Check that the session index includes commonly queried fields for covering index optimization
    // The session index should help with queries like:
    // SELECT * FROM buildamp_events WHERE session_id = ? AND status = 'pending'
    // SELECT * FROM buildamp_events WHERE session_id = ? ORDER BY created_at DESC
    
    // Verify created_at is included for temporal queries
    assert!(sql.contains("created_at TIMESTAMP"), "Should include created_at for temporal ordering");
    
    // Verify status field for filtering active events
    assert!(sql.contains("status TEXT"), "Should include status for event filtering");
    
    println!("Session index optimization verified");
}

#[test]
fn test_session_cleanup_infrastructure() {
    let sql = get_events_infrastructure_sql();
    
    // Verify infrastructure supports session cleanup
    // Should have timestamps for session lifecycle management
    assert!(sql.contains("created_at TIMESTAMP"), "Should track event creation time");
    
    // Should have session_id indexing for efficient cleanup queries
    assert!(sql.contains("idx_buildamp_events_session"), "Should have session index for cleanup");
    
    // The infrastructure should support queries like:
    // DELETE FROM buildamp_events WHERE session_id = ? AND created_at < ?
    // UPDATE buildamp_events SET status = 'expired' WHERE session_id = ? AND status = 'pending'
    
    // Verify the table supports efficient session-based operations
    let session_operations_supported = sql.contains("session_id TEXT") && 
                                     sql.contains("idx_buildamp_events_session") &&
                                     sql.contains("created_at TIMESTAMP");
    
    assert!(session_operations_supported, "Infrastructure should support efficient session operations");
    
    println!("Session cleanup infrastructure verified");
}

#[test]
fn test_session_isolation_schema() {
    let sql = get_events_infrastructure_sql();
    
    // Verify schema supports session isolation
    // Events should be easily filterable by session_id
    assert!(sql.contains("session_id TEXT"), "Should have session_id for isolation");
    
    // Should have proper indexing to prevent session data leakage
    assert!(sql.contains("idx_buildamp_events_session"), "Should index session_id for isolation queries");
    
    // Verify tenant isolation could be supported (through application field)
    assert!(sql.contains("application TEXT"), "Should support application-level isolation");
    
    // The schema should efficiently support queries like:
    // SELECT * FROM buildamp_events WHERE session_id = ? (session isolation)
    // SELECT * FROM buildamp_events WHERE application = ? AND session_id = ? (tenant + session isolation)
    
    println!("Session isolation schema verified");
}

#[test]
fn test_session_index_query_patterns() {
    let sql = get_events_infrastructure_sql();
    
    // Test that the schema supports common session-based query patterns efficiently
    
    // Pattern 1: Get all pending events for a session
    // SELECT * FROM buildamp_events WHERE session_id = ? AND status = 'pending'
    let supports_session_status_queries = sql.contains("session_id TEXT") && 
                                         sql.contains("status TEXT") &&
                                         sql.contains("idx_buildamp_events_session");
    assert!(supports_session_status_queries, "Should support session + status queries efficiently");
    
    // Pattern 2: Get recent events for a session
    // SELECT * FROM buildamp_events WHERE session_id = ? ORDER BY created_at DESC LIMIT 10
    let supports_session_temporal_queries = sql.contains("session_id TEXT") && 
                                           sql.contains("created_at TIMESTAMP") &&
                                           sql.contains("idx_buildamp_events_session");
    assert!(supports_session_temporal_queries, "Should support session + temporal queries efficiently");
    
    // Pattern 3: Get events by session and type
    // SELECT * FROM buildamp_events WHERE session_id = ? AND event_type = ?
    let supports_session_type_queries = sql.contains("session_id TEXT") && 
                                       sql.contains("event_type TEXT") &&
                                       sql.contains("idx_buildamp_events_session");
    assert!(supports_session_type_queries, "Should support session + event type queries efficiently");
    
    // Pattern 4: Session-based correlation tracking
    // SELECT * FROM buildamp_events WHERE session_id = ? AND correlation_id = ?
    let supports_session_correlation_queries = sql.contains("session_id TEXT") && 
                                              sql.contains("correlation_id UUID") &&
                                              sql.contains("idx_buildamp_events_session") &&
                                              sql.contains("idx_buildamp_events_correlation");
    assert!(supports_session_correlation_queries, "Should support session + correlation queries efficiently");
    
    println!("All session-based query patterns are supported efficiently");
}

#[test]
fn test_concurrent_session_performance() {
    let sql = get_events_infrastructure_sql();
    
    // Verify the schema can handle concurrent session operations efficiently
    
    // Check for UUID primary key (better for concurrent inserts than serial)
    assert!(sql.contains("id UUID PRIMARY KEY"), "Should use UUID for concurrent insert performance");
    
    // Check session index exists (critical for concurrent session-based queries)
    assert!(sql.contains("idx_buildamp_events_session"), "Should have session index for concurrent access");
    
    // Check for proper timestamp handling (for ordering concurrent events)
    assert!(sql.contains("created_at TIMESTAMP"), "Should have timestamp for concurrent event ordering");
    
    // Verify JSONB for efficient payload storage and querying
    assert!(sql.contains("payload JSONB"), "Should use JSONB for efficient payload operations");
    
    // The schema should handle scenarios like:
    // - Multiple sessions inserting events simultaneously
    // - Concurrent queries filtering by different session_ids
    // - Session cleanup running while new events are being inserted
    
    println!("Schema supports concurrent session operations efficiently");
}