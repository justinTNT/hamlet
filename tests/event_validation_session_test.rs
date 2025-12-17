// Test for session-aware event validation and metadata extraction
use proto_rust::framework::event_types::{EventValidation, SSEEffect};
use serde_json;

// Create a test event that implements session awareness
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct SessionAwareTestEvent {
    pub id: String,
    pub session_id: String,
    pub user_id: String,
    pub action: String,
    pub sse_effects: Vec<SSEEffect>,
}

impl EventValidation for SessionAwareTestEvent {
    fn extract_session_id(&self) -> Option<String> {
        Some(self.session_id.clone())
    }
    
    fn extract_sse_effects(&self) -> Vec<SSEEffect> {
        self.sse_effects.clone()
    }
    
    fn validate_required_fields(&self) -> Result<(), String> {
        if self.id.is_empty() {
            return Err("Event ID is required".to_string());
        }
        if self.session_id.is_empty() {
            return Err("Session ID is required".to_string());
        }
        if self.user_id.is_empty() {
            return Err("User ID is required".to_string());
        }
        Ok(())
    }
}

// Test event with multiple session targeting
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]  
struct MultiSessionEvent {
    pub id: String,
    pub target_sessions: Vec<String>,
    pub broadcast_data: String,
}

impl EventValidation for MultiSessionEvent {
    fn extract_sse_effects(&self) -> Vec<SSEEffect> {
        if self.target_sessions.is_empty() {
            // Broadcast to all if no specific sessions
            vec![SSEEffect::broadcast_to_tenant("multi_session_update", self.broadcast_data.clone())]
        } else {
            // Target specific sessions
            vec![SSEEffect::send_to_sessions(
                self.target_sessions.clone(),
                "targeted_update", 
                self.broadcast_data.clone()
            )]
        }
    }
}

// Test event without session awareness (default behavior)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct BasicEvent {
    pub id: String,
    pub data: String,
}

impl EventValidation for BasicEvent {
    // Uses default trait implementations (returns None/empty)
}

#[test]
fn test_session_id_extraction() {
    let session_event = SessionAwareTestEvent {
        id: "event_123".to_string(),
        session_id: "session_456".to_string(),
        user_id: "user_789".to_string(),
        action: "user_clicked_button".to_string(),
        sse_effects: vec![],
    };
    
    // Should extract the session ID
    let extracted_session = session_event.extract_session_id();
    assert_eq!(extracted_session, Some("session_456".to_string()));
    
    // Test that basic event returns None
    let basic_event = BasicEvent {
        id: "basic_123".to_string(),
        data: "test".to_string(),
    };
    
    let no_session = basic_event.extract_session_id();
    assert_eq!(no_session, None);
}

#[test]
fn test_sse_effects_extraction() {
    // Create event with SSE effects
    let sse_effects = vec![
        SSEEffect::send_to_session("session_1", "notification", r#"{"message": "Hello"}"#.to_string()),
        SSEEffect::broadcast_to_tenant("global_update", r#"{"version": "1.2.3"}"#.to_string()),
    ];
    
    let event = SessionAwareTestEvent {
        id: "event_with_sse".to_string(),
        session_id: "session_1".to_string(), 
        user_id: "user_1".to_string(),
        action: "triggered_notifications".to_string(),
        sse_effects: sse_effects.clone(),
    };
    
    // Should extract the SSE effects
    let extracted_effects = event.extract_sse_effects();
    assert_eq!(extracted_effects.len(), 2);
    
    // Verify the effects are correct
    match &extracted_effects[0] {
        SSEEffect::SendToSession { session_id, event_type, data } => {
            assert_eq!(session_id, "session_1");
            assert_eq!(event_type, "notification");
            assert!(data.contains("Hello"));
        }
        _ => panic!("Expected SendToSession effect"),
    }
    
    match &extracted_effects[1] {
        SSEEffect::BroadcastToTenant { event_type, data } => {
            assert_eq!(event_type, "global_update");
            assert!(data.contains("1.2.3"));
        }
        _ => panic!("Expected BroadcastToTenant effect"),
    }
    
    // Test that basic event returns empty effects
    let basic_event = BasicEvent {
        id: "basic_123".to_string(),
        data: "test".to_string(),
    };
    
    let no_effects = basic_event.extract_sse_effects();
    assert_eq!(no_effects.len(), 0);
}

#[test]
fn test_multi_session_targeting() {
    // Test event that targets multiple specific sessions
    let multi_session_event = MultiSessionEvent {
        id: "multi_123".to_string(),
        target_sessions: vec!["session_a".to_string(), "session_b".to_string(), "session_c".to_string()],
        broadcast_data: r#"{"update_type": "settings_changed"}"#.to_string(),
    };
    
    let effects = multi_session_event.extract_sse_effects();
    assert_eq!(effects.len(), 1);
    
    match &effects[0] {
        SSEEffect::SendToSessions { session_ids, event_type, data } => {
            assert_eq!(session_ids.len(), 3);
            assert!(session_ids.contains(&"session_a".to_string()));
            assert!(session_ids.contains(&"session_b".to_string()));  
            assert!(session_ids.contains(&"session_c".to_string()));
            assert_eq!(event_type, "targeted_update");
            assert!(data.contains("settings_changed"));
        }
        _ => panic!("Expected SendToSessions effect"),
    }
    
    // Test event with no target sessions (should broadcast to tenant)
    let broadcast_event = MultiSessionEvent {
        id: "broadcast_123".to_string(),
        target_sessions: vec![], // Empty = broadcast to all
        broadcast_data: r#"{"announcement": "System maintenance"}"#.to_string(),
    };
    
    let broadcast_effects = broadcast_event.extract_sse_effects();
    assert_eq!(broadcast_effects.len(), 1);
    
    match &broadcast_effects[0] {
        SSEEffect::BroadcastToTenant { event_type, data } => {
            assert_eq!(event_type, "multi_session_update");
            assert!(data.contains("System maintenance"));
        }
        _ => panic!("Expected BroadcastToTenant effect"),
    }
}

#[test]
fn test_event_validation_with_sessions() {
    // Test valid session-aware event
    let valid_event = SessionAwareTestEvent {
        id: "valid_event".to_string(),
        session_id: "session_valid".to_string(),
        user_id: "user_valid".to_string(),
        action: "valid_action".to_string(),
        sse_effects: vec![],
    };
    
    let validation_result = valid_event.validate_required_fields();
    assert!(validation_result.is_ok());
    
    // Test invalid event - missing session ID
    let invalid_session = SessionAwareTestEvent {
        id: "event_123".to_string(),
        session_id: "".to_string(), // Empty session ID
        user_id: "user_123".to_string(),
        action: "action".to_string(),
        sse_effects: vec![],
    };
    
    let session_validation = invalid_session.validate_required_fields();
    assert!(session_validation.is_err());
    assert_eq!(session_validation.unwrap_err(), "Session ID is required");
    
    // Test invalid event - missing user ID
    let invalid_user = SessionAwareTestEvent {
        id: "event_123".to_string(),
        session_id: "session_123".to_string(),
        user_id: "".to_string(), // Empty user ID
        action: "action".to_string(),
        sse_effects: vec![],
    };
    
    let user_validation = invalid_user.validate_required_fields();
    assert!(user_validation.is_err());
    assert_eq!(user_validation.unwrap_err(), "User ID is required");
    
    // Test invalid event - missing event ID
    let invalid_id = SessionAwareTestEvent {
        id: "".to_string(), // Empty event ID
        session_id: "session_123".to_string(),
        user_id: "user_123".to_string(),
        action: "action".to_string(),
        sse_effects: vec![],
    };
    
    let id_validation = invalid_id.validate_required_fields();
    assert!(id_validation.is_err());
    assert_eq!(id_validation.unwrap_err(), "Event ID is required");
}

#[test]
fn test_event_serialization_with_session_metadata() {
    // Test that session-aware events serialize properly
    let event = SessionAwareTestEvent {
        id: "serialization_test".to_string(),
        session_id: "session_serialize".to_string(),
        user_id: "user_serialize".to_string(),
        action: "test_serialization".to_string(),
        sse_effects: vec![
            SSEEffect::send_to_session("session_serialize", "echo", r#"{"echo": "test"}"#.to_string())
        ],
    };
    
    // Should serialize the full event including session metadata
    let json = serde_json::to_string(&event).expect("Should serialize session-aware event");
    println!("Session-aware event JSON: {}", json);
    
    // Should deserialize properly
    let deserialized: SessionAwareTestEvent = serde_json::from_str(&json)
        .expect("Should deserialize session-aware event");
    
    assert_eq!(deserialized.id, "serialization_test");
    assert_eq!(deserialized.session_id, "session_serialize");
    assert_eq!(deserialized.user_id, "user_serialize");
    assert_eq!(deserialized.action, "test_serialization");
    assert_eq!(deserialized.sse_effects.len(), 1);
    
    // Verify the SSE effect is preserved
    match &deserialized.sse_effects[0] {
        SSEEffect::SendToSession { session_id, event_type, data } => {
            assert_eq!(session_id, "session_serialize");
            assert_eq!(event_type, "echo");
            assert!(data.contains("echo"));
        }
        _ => panic!("Expected SendToSession effect in deserialized event"),
    }
}

#[test]
fn test_default_trait_implementations() {
    // Test that EventValidation provides sensible defaults
    let basic_event = BasicEvent {
        id: "default_test".to_string(),
        data: "test_data".to_string(),
    };
    
    // Default implementations should return None/empty
    assert_eq!(basic_event.extract_correlation_id(), None);
    assert_eq!(basic_event.extract_execute_at(), None);
    assert_eq!(basic_event.extract_session_id(), None);
    assert_eq!(basic_event.extract_sse_effects().len(), 0);
    assert!(basic_event.validate_required_fields().is_ok());
    
    println!("Default EventValidation implementations work correctly");
}

#[test]
fn test_complex_session_routing_scenarios() {
    // Test complex scenario: event affects multiple sessions differently
    struct ComplexRoutingEvent {
        primary_session: String,
        related_sessions: Vec<String>,
        admin_notification: bool,
    }
    
    impl EventValidation for ComplexRoutingEvent {
        fn extract_session_id(&self) -> Option<String> {
            Some(self.primary_session.clone())
        }
        
        fn extract_sse_effects(&self) -> Vec<SSEEffect> {
            let mut effects = vec![];
            
            // Send detailed update to primary session
            effects.push(SSEEffect::send_to_session(
                &self.primary_session,
                "primary_update",
                r#"{"type": "detailed", "priority": "high"}"#.to_string()
            ));
            
            // Send basic notification to related sessions
            if !self.related_sessions.is_empty() {
                effects.push(SSEEffect::send_to_sessions(
                    self.related_sessions.clone(),
                    "related_notification",
                    r#"{"type": "basic", "priority": "normal"}"#.to_string()
                ));
            }
            
            // Send admin notification if required
            if self.admin_notification {
                effects.push(SSEEffect::broadcast_to_tenant(
                    "admin_alert",
                    r#"{"level": "warning", "requires_action": true}"#.to_string()
                ));
            }
            
            effects
        }
    }
    
    let complex_event = ComplexRoutingEvent {
        primary_session: "primary_session".to_string(),
        related_sessions: vec!["related_1".to_string(), "related_2".to_string()],
        admin_notification: true,
    };
    
    // Should extract primary session
    assert_eq!(complex_event.extract_session_id(), Some("primary_session".to_string()));
    
    // Should generate 3 different SSE effects
    let effects = complex_event.extract_sse_effects();
    assert_eq!(effects.len(), 3);
    
    // Verify each effect type
    let effect_types: Vec<String> = effects.iter().map(|effect| {
        match effect {
            SSEEffect::SendToSession { event_type, .. } => event_type.clone(),
            SSEEffect::SendToSessions { event_type, .. } => event_type.clone(),
            SSEEffect::BroadcastToTenant { event_type, .. } => event_type.clone(),
        }
    }).collect();
    
    assert!(effect_types.contains(&"primary_update".to_string()));
    assert!(effect_types.contains(&"related_notification".to_string()));
    assert!(effect_types.contains(&"admin_alert".to_string()));
    
    println!("Complex session routing test passed: {} effects generated", effects.len());
}