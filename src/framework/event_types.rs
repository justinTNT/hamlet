// Event framework types for semantic event handling
// Parallel to database_types.rs but for background events

use serde::{Deserialize, Serialize};
use elm_rs::{Elm, ElmDecode, ElmEncode};
use std::fmt;

/// A correlation ID that links events back to originating requests
/// Framework extracts this to populate the correlation_id column
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
#[repr(transparent)]
pub struct CorrelationId<T>(pub T);

/// When an event should be executed
/// Framework extracts this to populate the execute_at column
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct ExecuteAt<T> {
    pub value: T,
}

/// Represents different execution time types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub enum DateTime {
    Timestamp(u64),           // Unix timestamp
    Iso8601(String),          // ISO 8601 string
    RelativeSeconds(u64),     // Seconds from now
}

/// Cron-style scheduling for recurring events  
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct Cron {
    pub expression: String,   // "0 9 * * *" = daily at 9am
    pub timezone: Option<String>, // "America/New_York"
}

// Constructors and utilities for CorrelationId

impl<T> CorrelationId<T> {
    /// Create a new correlation ID with the given value
    pub fn new(value: T) -> Self {
        CorrelationId(value)
    }
    
    /// Get a reference to the inner value
    pub fn get(&self) -> &T {
        &self.0
    }
    
    /// Convert to inner value
    pub fn into_inner(self) -> T {
        self.0
    }
}

impl CorrelationId<String> {
    /// Generate a new random correlation ID
    pub fn generate() -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        CorrelationId::new(format!("corr_{}", timestamp))
    }
    
    /// Get the inner string value
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl<T: fmt::Display> fmt::Display for CorrelationId<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// Constructors and utilities for ExecuteAt

impl<T> ExecuteAt<T> {
    /// Create a new ExecuteAt with the given value
    pub fn new(value: T) -> Self {
        ExecuteAt { value }
    }
    
    /// Get a reference to the inner value
    pub fn get(&self) -> &T {
        &self.value
    }
    
    /// Convert to inner value
    pub fn into_inner(self) -> T {
        self.value
    }
}

impl ExecuteAt<DateTime> {
    /// Execute immediately (now)
    pub fn now() -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        ExecuteAt::new(DateTime::Timestamp(timestamp))
    }
    
    /// Execute after a delay in seconds
    pub fn delay_seconds(seconds: u64) -> Self {
        ExecuteAt::new(DateTime::RelativeSeconds(seconds))
    }
    
    /// Execute at a specific Unix timestamp
    pub fn at_timestamp(timestamp: u64) -> Self {
        ExecuteAt::new(DateTime::Timestamp(timestamp))
    }
    
    /// Execute at a time specified by ISO 8601 string
    pub fn at_iso8601(iso_string: impl Into<String>) -> Self {
        ExecuteAt::new(DateTime::Iso8601(iso_string.into()))
    }
}

impl ExecuteAt<Cron> {
    /// Execute on a cron schedule
    pub fn cron(expression: impl Into<String>) -> Self {
        ExecuteAt::new(Cron {
            expression: expression.into(),
            timezone: None,
        })
    }
    
    /// Execute on a cron schedule with timezone
    pub fn cron_with_timezone(expression: impl Into<String>, timezone: impl Into<String>) -> Self {
        ExecuteAt::new(Cron {
            expression: expression.into(),
            timezone: Some(timezone.into()),
        })
    }
}

// Deref implementations for transparent access

impl<T> std::ops::Deref for CorrelationId<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> std::ops::Deref for ExecuteAt<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.value
    }
}

// From implementations for ergonomic construction

impl From<String> for CorrelationId<String> {
    fn from(id: String) -> Self {
        CorrelationId::new(id)
    }
}

impl From<&str> for CorrelationId<String> {
    fn from(id: &str) -> Self {
        CorrelationId::new(id.to_string())
    }
}

impl From<u64> for CorrelationId<u64> {
    fn from(id: u64) -> Self {
        CorrelationId::new(id)
    }
}

impl From<i32> for CorrelationId<i32> {
    fn from(id: i32) -> Self {
        CorrelationId::new(id)
    }
}

impl<T> From<T> for ExecuteAt<T> {
    fn from(value: T) -> Self {
        ExecuteAt::new(value)
    }
}

/// Session targeting for SSE events
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub enum SessionTarget {
    /// Send to a specific session by ID
    Session(String),
    /// Send to multiple sessions
    Sessions(Vec<String>),
    /// Send to all sessions for a tenant (host-level broadcast)
    AllInTenant,
}

/// Session-aware SSE effects for Elm handlers
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub enum SSEEffect {
    /// Send SSE event to specific session
    SendToSession { 
        session_id: String, 
        event_type: String, 
        data: String 
    },
    /// Broadcast SSE event to multiple sessions
    SendToSessions { 
        session_ids: Vec<String>, 
        event_type: String, 
        data: String 
    },
    /// Broadcast SSE event to all sessions in tenant
    BroadcastToTenant { 
        event_type: String, 
        data: String 
    },
}

impl SSEEffect {
    /// Create a session-targeted SSE effect
    pub fn send_to_session(session_id: impl Into<String>, event_type: impl Into<String>, data: String) -> Self {
        SSEEffect::SendToSession {
            session_id: session_id.into(),
            event_type: event_type.into(),
            data,
        }
    }

    /// Create a multi-session SSE effect
    pub fn send_to_sessions(session_ids: Vec<String>, event_type: impl Into<String>, data: String) -> Self {
        SSEEffect::SendToSessions {
            session_ids,
            event_type: event_type.into(),
            data,
        }
    }

    /// Create a tenant-wide SSE effect
    pub fn broadcast_to_tenant(event_type: impl Into<String>, data: String) -> Self {
        SSEEffect::BroadcastToTenant {
            event_type: event_type.into(),
            data,
        }
    }
}

/// Event validation trait - framework uses this to extract metadata
pub trait EventValidation {
    /// Extract correlation ID if present in the event
    fn extract_correlation_id(&self) -> Option<String> {
        None
    }
    
    /// Extract execution time if present in the event  
    fn extract_execute_at(&self) -> Option<String> {
        None
    }
    
    /// Extract session ID if present in the event for targeting
    fn extract_session_id(&self) -> Option<String> {
        None
    }
    
    /// Extract SSE effects if present in the event
    fn extract_sse_effects(&self) -> Vec<SSEEffect> {
        Vec::new()
    }
    
    /// Validate required fields are present
    fn validate_required_fields(&self) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_correlation_id_string() {
        let corr_id = CorrelationId::new("test-123".to_string());
        assert_eq!(corr_id.as_str(), "test-123");
        assert_eq!(*corr_id, "test-123");
        
        let generated = CorrelationId::<String>::generate();
        assert!(generated.as_str().starts_with("corr_"));
        
        // Test From implementations
        let from_str: CorrelationId<String> = "hello".into();
        assert_eq!(from_str.as_str(), "hello");
        
        let from_string: CorrelationId<String> = "world".to_string().into();
        assert_eq!(from_string.as_str(), "world");
    }
    
    #[test]
    fn test_correlation_id_numeric() {
        let corr_id_u64 = CorrelationId::new(12345u64);
        assert_eq!(*corr_id_u64, 12345u64);
        
        let corr_id_i32 = CorrelationId::new(-456i32);
        assert_eq!(*corr_id_i32, -456i32);
        
        // Test From implementations
        let from_u64: CorrelationId<u64> = 789u64.into();
        assert_eq!(*from_u64, 789u64);
        
        let from_i32: CorrelationId<i32> = 101i32.into();
        assert_eq!(*from_i32, 101i32);
    }
    
    #[test]
    fn test_execute_at_datetime() {
        let execute_now = ExecuteAt::<DateTime>::now();
        match execute_now.get() {
            DateTime::Timestamp(_) => {}, // Expected
            _ => panic!("Expected timestamp"),
        }
        
        let execute_delay = ExecuteAt::<DateTime>::delay_seconds(300);
        match execute_delay.get() {
            DateTime::RelativeSeconds(300) => {}, // Expected
            _ => panic!("Expected relative seconds"),
        }
        
        let execute_iso = ExecuteAt::<DateTime>::at_iso8601("2024-01-01T00:00:00Z");
        match execute_iso.get() {
            DateTime::Iso8601(iso) => assert_eq!(iso, "2024-01-01T00:00:00Z"),
            _ => panic!("Expected ISO string"),
        }
    }
    
    #[test]
    fn test_execute_at_cron() {
        let daily_9am = ExecuteAt::<Cron>::cron("0 9 * * *");
        assert_eq!(daily_9am.get().expression, "0 9 * * *");
        assert_eq!(daily_9am.get().timezone, None);
        
        let daily_9am_ny = ExecuteAt::<Cron>::cron_with_timezone("0 9 * * *", "America/New_York");
        assert_eq!(daily_9am_ny.get().expression, "0 9 * * *");
        assert_eq!(daily_9am_ny.get().timezone, Some("America/New_York".to_string()));
    }
    
    #[test]
    fn test_serialization() {
        let corr_id = CorrelationId::new("serialize-test".to_string());
        let json = serde_json::to_string(&corr_id).unwrap();
        let deserialized: CorrelationId<String> = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.as_str(), "serialize-test");
        
        let execute_at = ExecuteAt::<DateTime>::delay_seconds(60);
        let json = serde_json::to_string(&execute_at).unwrap();
        let deserialized: ExecuteAt<DateTime> = serde_json::from_str(&json).unwrap();
        match deserialized.get() {
            DateTime::RelativeSeconds(60) => {},
            _ => panic!("Serialization roundtrip failed"),
        }
    }
    
    #[test]
    fn test_session_target() {
        let session_target = SessionTarget::Session("session-123".to_string());
        let json = serde_json::to_string(&session_target).unwrap();
        let deserialized: SessionTarget = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SessionTarget::Session("session-123".to_string()));
        
        let multi_session = SessionTarget::Sessions(vec!["s1".to_string(), "s2".to_string()]);
        let json = serde_json::to_string(&multi_session).unwrap();
        let deserialized: SessionTarget = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SessionTarget::Sessions(vec!["s1".to_string(), "s2".to_string()]));
    }
    
    #[test]
    fn test_sse_effect() {
        let test_data = r#"{"message": "hello"}"#.to_string();
        
        let effect = SSEEffect::send_to_session("session-123", "UserMessage", test_data.clone());
        let json = serde_json::to_string(&effect).unwrap();
        let deserialized: SSEEffect = serde_json::from_str(&json).unwrap();
        
        match deserialized {
            SSEEffect::SendToSession { session_id, event_type, data } => {
                assert_eq!(session_id, "session-123");
                assert_eq!(event_type, "UserMessage");
                assert_eq!(data, test_data);
            },
            _ => panic!("Expected SendToSession variant"),
        }
        
        let broadcast_effect = SSEEffect::broadcast_to_tenant("GlobalNotification", test_data.clone());
        match broadcast_effect {
            SSEEffect::BroadcastToTenant { event_type, data } => {
                assert_eq!(event_type, "GlobalNotification");
                assert_eq!(data, test_data);
            },
            _ => panic!("Expected BroadcastToTenant variant"),
        }
    }
}