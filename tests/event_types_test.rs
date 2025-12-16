// Test for event framework types and validation
use proto_rust::*;
use proto_rust::events_send_welcome_email::SendWelcomeEmail;
use proto_rust::events_process_video::{ProcessVideo, GenerateDailyReport};
use serde_json;
use std::collections::HashMap;

#[test]
fn test_correlation_id_functionality() {
    // Test creation and usage
    let corr_id = CorrelationId::new("req-123");
    assert_eq!(corr_id.as_str(), "req-123");
    assert_eq!(*corr_id, "req-123");
    
    // Test generation
    let generated = CorrelationId::generate();
    assert!(generated.as_str().starts_with("corr_"));
    
    // Test serialization
    let json = serde_json::to_string(&corr_id).expect("Should serialize");
    let deserialized: CorrelationId = serde_json::from_str(&json).expect("Should deserialize");
    assert_eq!(deserialized.as_str(), "req-123");
    
    println!("CorrelationId JSON: {}", json);
}

#[test]
fn test_execute_at_datetime() {
    // Test immediate execution
    let execute_now = ExecuteAt::<DateTime>::now();
    match execute_now.get() {
        DateTime::Timestamp(_) => {}, // Expected
        _ => panic!("Expected timestamp for now()"),
    }
    
    // Test delayed execution
    let execute_delay = ExecuteAt::<DateTime>::delay_seconds(300);
    match execute_delay.get() {
        DateTime::RelativeSeconds(300) => {}, // Expected
        _ => panic!("Expected relative seconds"),
    }
    
    // Test ISO 8601 execution time
    let execute_iso = ExecuteAt::<DateTime>::at_iso8601("2024-12-31T23:59:59Z");
    match execute_iso.get() {
        DateTime::Iso8601(iso) => assert_eq!(iso, "2024-12-31T23:59:59Z"),
        _ => panic!("Expected ISO string"),
    }
    
    // Test serialization
    let json = serde_json::to_string(&execute_delay).expect("Should serialize");
    let deserialized: ExecuteAt<DateTime> = serde_json::from_str(&json).expect("Should deserialize");
    match deserialized.get() {
        DateTime::RelativeSeconds(300) => {},
        _ => panic!("Serialization roundtrip failed"),
    }
    
    println!("ExecuteAt<DateTime> JSON: {}", json);
}

#[test]
fn test_execute_at_cron() {
    // Test basic cron expression
    let daily_9am = ExecuteAt::<Cron>::cron("0 9 * * *");
    assert_eq!(daily_9am.get().expression, "0 9 * * *");
    assert_eq!(daily_9am.get().timezone, None);
    
    // Test cron with timezone
    let daily_9am_ny = ExecuteAt::<Cron>::cron_with_timezone("0 9 * * *", "America/New_York");
    assert_eq!(daily_9am_ny.get().expression, "0 9 * * *");
    assert_eq!(daily_9am_ny.get().timezone, Some("America/New_York".to_string()));
    
    // Test serialization
    let json = serde_json::to_string(&daily_9am_ny).expect("Should serialize");
    let deserialized: ExecuteAt<Cron> = serde_json::from_str(&json).expect("Should deserialize");
    assert_eq!(deserialized.get().expression, "0 9 * * *");
    assert_eq!(deserialized.get().timezone, Some("America/New_York".to_string()));
    
    println!("ExecuteAt<Cron> JSON: {}", json);
}

#[test]
fn test_send_welcome_email_with_framework_types() {
    // Test event model using framework types
    let event = SendWelcomeEmail {
        correlation_id: CorrelationId::new("signup-456"),
        user_id: "user-789".to_string(),
        email: "user@example.com".to_string(),
        name: "John Doe".to_string(),
        execute_at: Some(ExecuteAt::<DateTime>::delay_seconds(60)), // Send after 1 minute
        template_vars: Some({
            let mut vars = HashMap::new();
            vars.insert("welcome_bonus".to_string(), "$10".to_string());
            vars
        }),
    };
    
    // Should serialize with framework types
    let json = serde_json::to_string(&event).expect("Should serialize event");
    println!("SendWelcomeEmail JSON: {}", json);
    
    // Should deserialize correctly
    let deserialized: SendWelcomeEmail = serde_json::from_str(&json).expect("Should deserialize event");
    assert_eq!(deserialized.correlation_id.as_str(), "signup-456");
    assert_eq!(deserialized.user_id, "user-789");
    assert_eq!(deserialized.email, "user@example.com");
    assert_eq!(deserialized.name, "John Doe");
    
    // Check optional execute_at
    assert!(deserialized.execute_at.is_some());
    match deserialized.execute_at.unwrap().get() {
        DateTime::RelativeSeconds(60) => {},
        _ => panic!("Expected relative seconds"),
    }
    
    // Check optional template_vars
    assert!(deserialized.template_vars.is_some());
    let vars = deserialized.template_vars.unwrap();
    assert_eq!(vars.get("welcome_bonus"), Some(&"$10".to_string()));
}

#[test]
fn test_process_video_with_required_framework_types() {
    // Test event model with required ExecuteAt
    let event = ProcessVideo {
        correlation_id: CorrelationId::new("upload-123"),
        video_id: "vid-456".to_string(),
        execute_at: ExecuteAt::<DateTime>::at_iso8601("2024-01-15T14:30:00Z"),
        quality_preset: Some("high".to_string()),
        webhook_url: None, // Optional webhook
    };
    
    let json = serde_json::to_string(&event).expect("Should serialize process video event");
    println!("ProcessVideo JSON: {}", json);
    
    let deserialized: ProcessVideo = serde_json::from_str(&json).expect("Should deserialize");
    assert_eq!(deserialized.correlation_id.as_str(), "upload-123");
    assert_eq!(deserialized.video_id, "vid-456");
    
    match deserialized.execute_at.get() {
        DateTime::Iso8601(iso) => assert_eq!(iso, "2024-01-15T14:30:00Z"),
        _ => panic!("Expected ISO timestamp"),
    }
    
    assert_eq!(deserialized.quality_preset, Some("high".to_string()));
    assert_eq!(deserialized.webhook_url, None);
}

#[test]
fn test_generate_daily_report_with_cron() {
    // Test event model with cron scheduling
    let event = GenerateDailyReport {
        user_id: "user-999".to_string(),
        execute_at: ExecuteAt::<Cron>::cron_with_timezone("0 9 * * *", "America/Los_Angeles"),
        report_type: "usage_summary".to_string(),
        email_results: Some("admin@company.com".to_string()),
    };
    
    let json = serde_json::to_string(&event).expect("Should serialize daily report event");
    println!("GenerateDailyReport JSON: {}", json);
    
    let deserialized: GenerateDailyReport = serde_json::from_str(&json).expect("Should deserialize");
    assert_eq!(deserialized.user_id, "user-999");
    assert_eq!(deserialized.report_type, "usage_summary");
    
    let cron = deserialized.execute_at.get();
    assert_eq!(cron.expression, "0 9 * * *");
    assert_eq!(cron.timezone, Some("America/Los_Angeles".to_string()));
    
    assert_eq!(deserialized.email_results, Some("admin@company.com".to_string()));
}

#[test]
fn test_framework_types_with_option_none() {
    // Test event model with None for optional framework types
    let event = SendWelcomeEmail {
        correlation_id: CorrelationId::generate(),
        user_id: "user-minimal".to_string(),
        email: "minimal@example.com".to_string(),
        name: "Minimal User".to_string(),
        execute_at: None, // Framework should use now()
        template_vars: None, // No customization
    };
    
    let json = serde_json::to_string(&event).expect("Should serialize minimal event");
    println!("Minimal SendWelcomeEmail JSON: {}", json);
    
    let deserialized: SendWelcomeEmail = serde_json::from_str(&json).expect("Should deserialize");
    assert_eq!(deserialized.user_id, "user-minimal");
    assert_eq!(deserialized.execute_at, None);
    assert_eq!(deserialized.template_vars, None);
}

#[test]
fn test_framework_types_elm_compatibility() {
    // Test that framework types produce Elm-compatible JSON
    let corr_id = CorrelationId::new("elm-test");
    let execute_at = ExecuteAt::<DateTime>::delay_seconds(120);
    
    let corr_json = serde_json::to_string(&corr_id).expect("Should serialize");
    let exec_json = serde_json::to_string(&execute_at).expect("Should serialize");
    
    // Parse as generic JSON to verify structure
    let corr_parsed: serde_json::Value = serde_json::from_str(&corr_json).expect("Should parse");
    let exec_parsed: serde_json::Value = serde_json::from_str(&exec_json).expect("Should parse");
    
    // CorrelationId should serialize as simple string (transparent)
    assert_eq!(corr_parsed, "elm-test");
    
    // ExecuteAt should serialize as object with value field
    assert_eq!(exec_parsed["value"]["RelativeSeconds"], 120);
    
    println!("Elm-compatible CorrelationId: {}", corr_json);
    println!("Elm-compatible ExecuteAt: {}", exec_json);
}