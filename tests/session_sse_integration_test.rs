// Integration tests for session-aware SSE pipeline: Events → Session targeting → SSE delivery
use proto_rust::framework::event_types::{EventValidation, SSEEffect, CorrelationId};
use serde_json;
use std::collections::HashMap;

// Mock event that demonstrates full session-SSE integration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct UserActivityEvent {
    pub id: String,
    pub correlation_id: CorrelationId<String>,
    pub session_id: String,
    pub user_id: String,
    pub action_type: String,
    pub target_resource: String,
    pub metadata: HashMap<String, String>,
    pub notify_related_sessions: Vec<String>,
    pub requires_admin_notification: bool,
}

impl EventValidation for UserActivityEvent {
    fn extract_correlation_id(&self) -> Option<String> {
        Some(self.correlation_id.as_str().to_string())
    }
    
    fn extract_session_id(&self) -> Option<String> {
        Some(self.session_id.clone())
    }
    
    fn extract_sse_effects(&self) -> Vec<SSEEffect> {
        let mut effects = vec![];
        
        // Primary session gets detailed notification
        effects.push(SSEEffect::send_to_session(
            &self.session_id,
            "activity_confirmed",
            serde_json::to_string(&serde_json::json!({
                "activity_id": self.id,
                "action": self.action_type,
                "resource": self.target_resource,
                "details": self.metadata,
                "timestamp": 1640995200
            })).unwrap_or_else(|_| "{}".to_string())
        ));
        
        // Related sessions get basic notification
        if !self.notify_related_sessions.is_empty() {
            effects.push(SSEEffect::send_to_sessions(
                self.notify_related_sessions.clone(),
                "related_activity",
                serde_json::to_string(&serde_json::json!({
                    "user_id": self.user_id,
                    "action": self.action_type,
                    "resource": self.target_resource
                })).unwrap_or_else(|_| "{}".to_string())
            ));
        }
        
        // Admin notification for sensitive actions
        if self.requires_admin_notification {
            effects.push(SSEEffect::broadcast_to_tenant(
                "admin_activity_alert",
                serde_json::to_string(&serde_json::json!({
                    "alert_level": "info",
                    "user_id": self.user_id,
                    "session_id": self.session_id,
                    "action": self.action_type,
                    "resource": self.target_resource,
                    "correlation_id": self.correlation_id.as_str()
                })).unwrap_or_else(|_| "{}".to_string())
            ));
        }
        
        effects
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
        if self.action_type.is_empty() {
            return Err("Action type is required".to_string());
        }
        Ok(())
    }
}

// Multi-tenant collaboration event
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct CollaborationEvent {
    pub id: String,
    pub initiator_session: String,
    pub participant_sessions: Vec<String>,
    pub document_id: String,
    pub change_type: String,
    pub change_data: String,
}

impl EventValidation for CollaborationEvent {
    fn extract_session_id(&self) -> Option<String> {
        Some(self.initiator_session.clone())
    }
    
    fn extract_sse_effects(&self) -> Vec<SSEEffect> {
        let mut effects = vec![];
        
        // Notify the initiator of successful change
        effects.push(SSEEffect::send_to_session(
            &self.initiator_session,
            "change_applied",
            serde_json::to_string(&serde_json::json!({
                "change_id": self.id,
                "document_id": self.document_id,
                "type": self.change_type,
                "status": "applied"
            })).unwrap_or_else(|_| "{}".to_string())
        ));
        
        // Notify all participants of the change
        if !self.participant_sessions.is_empty() {
            effects.push(SSEEffect::send_to_sessions(
                self.participant_sessions.clone(),
                "document_updated",
                serde_json::to_string(&serde_json::json!({
                    "document_id": self.document_id,
                    "change_type": self.change_type,
                    "change_data": self.change_data,
                    "initiator_session": self.initiator_session
                })).unwrap_or_else(|_| "{}".to_string())
            ));
        }
        
        effects
    }
}

#[test]
fn test_event_to_sse_session_targeting() {
    println!("Testing full event → SSE session targeting pipeline...");
    
    // Create a comprehensive user activity event
    let activity_event = UserActivityEvent {
        id: "activity_123".to_string(),
        correlation_id: CorrelationId::new("corr_456".to_string()),
        session_id: "primary_session".to_string(),
        user_id: "user_789".to_string(),
        action_type: "document_edited".to_string(),
        target_resource: "document_abc".to_string(),
        metadata: {
            let mut meta = HashMap::new();
            meta.insert("editor".to_string(), "monaco".to_string());
            meta.insert("lines_changed".to_string(), "15".to_string());
            meta
        },
        notify_related_sessions: vec!["viewer_session_1".to_string(), "viewer_session_2".to_string()],
        requires_admin_notification: true,
    };
    
    // Validate the event
    assert!(activity_event.validate_required_fields().is_ok());
    
    // Extract session metadata
    let session_id = activity_event.extract_session_id();
    assert_eq!(session_id, Some("primary_session".to_string()));
    
    let correlation_id = activity_event.extract_correlation_id();
    assert_eq!(correlation_id, Some("corr_456".to_string()));
    
    // Extract SSE effects - should generate 3 effects
    let sse_effects = activity_event.extract_sse_effects();
    assert_eq!(sse_effects.len(), 3, "Should generate 3 SSE effects");
    
    // Verify primary session effect
    let primary_effect = &sse_effects[0];
    match primary_effect {
        SSEEffect::SendToSession { session_id, event_type, data } => {
            assert_eq!(session_id, "primary_session");
            assert_eq!(event_type, "activity_confirmed");
            
            // Verify the data contains expected fields
            let parsed_data: serde_json::Value = serde_json::from_str(data).expect("Should parse effect data");
            assert_eq!(parsed_data["activity_id"], "activity_123");
            assert_eq!(parsed_data["action"], "document_edited");
            assert_eq!(parsed_data["resource"], "document_abc");
            assert!(parsed_data["details"].is_object());
        }
        _ => panic!("First effect should be SendToSession for primary session"),
    }
    
    // Verify related sessions effect
    let related_effect = &sse_effects[1];
    match related_effect {
        SSEEffect::SendToSessions { session_ids, event_type, data } => {
            assert_eq!(session_ids.len(), 2);
            assert!(session_ids.contains(&"viewer_session_1".to_string()));
            assert!(session_ids.contains(&"viewer_session_2".to_string()));
            assert_eq!(event_type, "related_activity");
            
            let parsed_data: serde_json::Value = serde_json::from_str(data).expect("Should parse related effect data");
            assert_eq!(parsed_data["user_id"], "user_789");
            assert_eq!(parsed_data["action"], "document_edited");
        }
        _ => panic!("Second effect should be SendToSessions for related sessions"),
    }
    
    // Verify admin notification effect
    let admin_effect = &sse_effects[2];
    match admin_effect {
        SSEEffect::BroadcastToTenant { event_type, data } => {
            assert_eq!(event_type, "admin_activity_alert");
            
            let parsed_data: serde_json::Value = serde_json::from_str(data).expect("Should parse admin effect data");
            assert_eq!(parsed_data["alert_level"], "info");
            assert_eq!(parsed_data["user_id"], "user_789");
            assert_eq!(parsed_data["session_id"], "primary_session");
            assert_eq!(parsed_data["correlation_id"], "corr_456");
        }
        _ => panic!("Third effect should be BroadcastToTenant for admin notification"),
    }
    
    println!("✅ Event → SSE targeting pipeline working correctly");
}

#[test]
fn test_multi_tenant_session_isolation() {
    println!("Testing multi-tenant session isolation...");
    
    // Create events from different tenants (simulated via different session prefixes)
    let tenant_a_event = UserActivityEvent {
        id: "tenant_a_event".to_string(),
        correlation_id: CorrelationId::new("tenant_a_corr".to_string()),
        session_id: "tenant_a_session_123".to_string(),
        user_id: "tenant_a_user_456".to_string(),
        action_type: "file_upload".to_string(),
        target_resource: "tenant_a_document".to_string(),
        metadata: HashMap::new(),
        notify_related_sessions: vec!["tenant_a_session_789".to_string()],
        requires_admin_notification: false,
    };
    
    let tenant_b_event = UserActivityEvent {
        id: "tenant_b_event".to_string(),
        correlation_id: CorrelationId::new("tenant_b_corr".to_string()),
        session_id: "tenant_b_session_456".to_string(),
        user_id: "tenant_b_user_789".to_string(),
        action_type: "file_upload".to_string(),
        target_resource: "tenant_b_document".to_string(),
        metadata: HashMap::new(),
        notify_related_sessions: vec!["tenant_b_session_012".to_string()],
        requires_admin_notification: false,
    };
    
    // Extract SSE effects for both tenants
    let tenant_a_effects = tenant_a_event.extract_sse_effects();
    let tenant_b_effects = tenant_b_event.extract_sse_effects();
    
    // Verify that tenant A effects only target tenant A sessions
    for effect in &tenant_a_effects {
        match effect {
            SSEEffect::SendToSession { session_id, .. } => {
                assert!(session_id.starts_with("tenant_a_"), "Tenant A effect should only target tenant A sessions");
            }
            SSEEffect::SendToSessions { session_ids, .. } => {
                for session_id in session_ids {
                    assert!(session_id.starts_with("tenant_a_"), "Tenant A multi-session effect should only target tenant A sessions");
                }
            }
            SSEEffect::BroadcastToTenant { .. } => {
                // Tenant broadcasts are isolated by the delivery mechanism, not here
            }
        }
    }
    
    // Verify that tenant B effects only target tenant B sessions
    for effect in &tenant_b_effects {
        match effect {
            SSEEffect::SendToSession { session_id, .. } => {
                assert!(session_id.starts_with("tenant_b_"), "Tenant B effect should only target tenant B sessions");
            }
            SSEEffect::SendToSessions { session_ids, .. } => {
                for session_id in session_ids {
                    assert!(session_id.starts_with("tenant_b_"), "Tenant B multi-session effect should only target tenant B sessions");
                }
            }
            SSEEffect::BroadcastToTenant { .. } => {
                // Tenant broadcasts are isolated by the delivery mechanism, not here
            }
        }
    }
    
    // Verify no session ID overlap between tenants
    let tenant_a_sessions: Vec<String> = tenant_a_effects.iter()
        .flat_map(|effect| match effect {
            SSEEffect::SendToSession { session_id, .. } => vec![session_id.clone()],
            SSEEffect::SendToSessions { session_ids, .. } => session_ids.clone(),
            SSEEffect::BroadcastToTenant { .. } => vec![],
        })
        .collect();
    
    let tenant_b_sessions: Vec<String> = tenant_b_effects.iter()
        .flat_map(|effect| match effect {
            SSEEffect::SendToSession { session_id, .. } => vec![session_id.clone()],
            SSEEffect::SendToSessions { session_ids, .. } => session_ids.clone(),
            SSEEffect::BroadcastToTenant { .. } => vec![],
        })
        .collect();
    
    // Ensure no cross-tenant session targeting
    for tenant_a_session in &tenant_a_sessions {
        assert!(!tenant_b_sessions.contains(tenant_a_session), "No cross-tenant session targeting should occur");
    }
    
    println!("✅ Multi-tenant session isolation working correctly");
}

#[test]
fn test_collaboration_session_coordination() {
    println!("Testing collaboration session coordination...");
    
    // Create a collaboration event
    let collab_event = CollaborationEvent {
        id: "collab_change_123".to_string(),
        initiator_session: "editor_session".to_string(),
        participant_sessions: vec![
            "viewer_session_1".to_string(),
            "viewer_session_2".to_string(),
            "reviewer_session".to_string()
        ],
        document_id: "shared_doc_456".to_string(),
        change_type: "text_insertion".to_string(),
        change_data: r#"{"position": 150, "text": "Hello, world!"}"#.to_string(),
    };
    
    // Extract SSE effects
    let effects = collab_event.extract_sse_effects();
    assert_eq!(effects.len(), 2, "Should generate 2 coordination effects");
    
    // Verify initiator confirmation
    match &effects[0] {
        SSEEffect::SendToSession { session_id, event_type, data } => {
            assert_eq!(session_id, "editor_session");
            assert_eq!(event_type, "change_applied");
            
            let parsed_data: serde_json::Value = serde_json::from_str(data).expect("Should parse confirmation data");
            assert_eq!(parsed_data["change_id"], "collab_change_123");
            assert_eq!(parsed_data["document_id"], "shared_doc_456");
            assert_eq!(parsed_data["status"], "applied");
        }
        _ => panic!("First effect should be confirmation to initiator"),
    }
    
    // Verify participant notifications
    match &effects[1] {
        SSEEffect::SendToSessions { session_ids, event_type, data } => {
            assert_eq!(session_ids.len(), 3);
            assert!(session_ids.contains(&"viewer_session_1".to_string()));
            assert!(session_ids.contains(&"viewer_session_2".to_string()));
            assert!(session_ids.contains(&"reviewer_session".to_string()));
            assert_eq!(event_type, "document_updated");
            
            let parsed_data: serde_json::Value = serde_json::from_str(data).expect("Should parse update data");
            assert_eq!(parsed_data["document_id"], "shared_doc_456");
            assert_eq!(parsed_data["change_type"], "text_insertion");
            assert_eq!(parsed_data["initiator_session"], "editor_session");
            
            // Verify change data is preserved
            let change_data: serde_json::Value = serde_json::from_str(parsed_data["change_data"].as_str().unwrap())
                .expect("Should parse nested change data");
            assert_eq!(change_data["position"], 150);
            assert_eq!(change_data["text"], "Hello, world!");
        }
        _ => panic!("Second effect should be notifications to participants"),
    }
    
    println!("✅ Collaboration session coordination working correctly");
}

#[test]
fn test_session_sse_serialization_pipeline() {
    println!("Testing full serialization pipeline for session-SSE integration...");
    
    // Create a complex event
    let event = UserActivityEvent {
        id: "serialize_test".to_string(),
        correlation_id: CorrelationId::new("serialize_corr".to_string()),
        session_id: "serialize_session".to_string(),
        user_id: "serialize_user".to_string(),
        action_type: "complex_action".to_string(),
        target_resource: "serialize_resource".to_string(),
        metadata: {
            let mut meta = HashMap::new();
            meta.insert("key1".to_string(), "value1".to_string());
            meta.insert("key2".to_string(), "value2".to_string());
            meta
        },
        notify_related_sessions: vec!["related1".to_string(), "related2".to_string()],
        requires_admin_notification: true,
    };
    
    // Test event serialization
    let event_json = serde_json::to_string(&event).expect("Should serialize event");
    println!("Event JSON: {}", event_json);
    
    // Test event deserialization
    let deserialized_event: UserActivityEvent = serde_json::from_str(&event_json)
        .expect("Should deserialize event");
    
    // Verify event deserialization preserved all data
    assert_eq!(deserialized_event.id, "serialize_test");
    assert_eq!(deserialized_event.correlation_id.as_str(), "serialize_corr");
    assert_eq!(deserialized_event.session_id, "serialize_session");
    
    // Extract and test SSE effects serialization
    let effects = deserialized_event.extract_sse_effects();
    
    for (i, effect) in effects.iter().enumerate() {
        let effect_json = serde_json::to_string(effect).expect("Should serialize SSE effect");
        println!("SSE Effect {} JSON: {}", i, effect_json);
        
        let deserialized_effect: SSEEffect = serde_json::from_str(&effect_json)
            .expect("Should deserialize SSE effect");
        
        // Verify effect types are preserved
        match (effect, deserialized_effect) {
            (SSEEffect::SendToSession { session_id: s1, event_type: e1, data: d1 }, 
             SSEEffect::SendToSession { session_id: s2, event_type: e2, data: d2 }) => {
                assert_eq!(s1, &s2);
                assert_eq!(e1, &e2);
                assert_eq!(d1, &d2);
            }
            (SSEEffect::SendToSessions { session_ids: ss1, event_type: e1, data: d1 },
             SSEEffect::SendToSessions { session_ids: ss2, event_type: e2, data: d2 }) => {
                assert_eq!(ss1, &ss2);
                assert_eq!(e1, &e2);
                assert_eq!(d1, &d2);
            }
            (SSEEffect::BroadcastToTenant { event_type: e1, data: d1 },
             SSEEffect::BroadcastToTenant { event_type: e2, data: d2 }) => {
                assert_eq!(e1, &e2);
                assert_eq!(d1, &d2);
            }
            _ => panic!("SSE effect type changed during serialization"),
        }
    }
    
    println!("✅ Full serialization pipeline working correctly");
}

#[test]
fn test_session_sse_error_handling() {
    println!("Testing error handling in session-SSE pipeline...");
    
    // Test event with invalid data
    let invalid_event = UserActivityEvent {
        id: "".to_string(), // Invalid: empty ID
        correlation_id: CorrelationId::new("test_corr".to_string()),
        session_id: "".to_string(), // Invalid: empty session ID
        user_id: "valid_user".to_string(),
        action_type: "".to_string(), // Invalid: empty action
        target_resource: "valid_resource".to_string(),
        metadata: HashMap::new(),
        notify_related_sessions: vec![],
        requires_admin_notification: false,
    };
    
    // Should fail validation
    let validation_result = invalid_event.validate_required_fields();
    assert!(validation_result.is_err());
    
    // Should still be able to extract session metadata (even if invalid)
    let session_id = invalid_event.extract_session_id();
    assert_eq!(session_id, Some("".to_string()));
    
    // Should still be able to generate SSE effects (even with invalid data)
    let effects = invalid_event.extract_sse_effects();
    assert!(!effects.is_empty(), "Should still generate effects even with invalid event data");
    
    // Test event with malformed JSON in metadata
    let event_with_complex_metadata = UserActivityEvent {
        id: "complex_test".to_string(),
        correlation_id: CorrelationId::new("complex_corr".to_string()),
        session_id: "complex_session".to_string(),
        user_id: "complex_user".to_string(),
        action_type: "complex_action".to_string(),
        target_resource: "complex_resource".to_string(),
        metadata: {
            let mut meta = HashMap::new();
            meta.insert("json_data".to_string(), r#"{"nested": {"value": 123}}"#.to_string());
            meta.insert("special_chars".to_string(), "Value with \"quotes\" and \nnewlines".to_string());
            meta
        },
        notify_related_sessions: vec!["session_with_special_chars_!@#$%".to_string()],
        requires_admin_notification: true,
    };
    
    // Should handle complex metadata gracefully
    let effects = event_with_complex_metadata.extract_sse_effects();
    assert!(!effects.is_empty());
    
    // Verify that special characters in session IDs are preserved
    match &effects[1] {
        SSEEffect::SendToSessions { session_ids, .. } => {
            assert!(session_ids.contains(&"session_with_special_chars_!@#$%".to_string()));
        }
        _ => panic!("Expected SendToSessions effect"),
    }
    
    println!("✅ Error handling working correctly");
}