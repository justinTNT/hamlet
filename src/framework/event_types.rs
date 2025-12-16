// Event framework types for semantic event handling
// Parallel to database_types.rs but for background events

use serde::{Deserialize, Serialize};
use elm_rs::{Elm, ElmDecode, ElmEncode};
use std::fmt;

/// A correlation ID that links events back to originating requests
/// Framework extracts this to populate the correlation_id column
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
#[repr(transparent)]
pub struct CorrelationId(pub String);

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

impl CorrelationId {
    /// Create a new correlation ID from a string
    pub fn new(id: impl Into<String>) -> Self {
        CorrelationId(id.into())
    }
    
    /// Generate a new random correlation ID
    pub fn generate() -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        CorrelationId(format!("corr_{}", timestamp))
    }
    
    /// Get the inner string value
    pub fn as_str(&self) -> &str {
        &self.0
    }
    
    /// Convert to inner string
    pub fn into_inner(self) -> String {
        self.0
    }
}

impl fmt::Display for CorrelationId {
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

impl std::ops::Deref for CorrelationId {
    type Target = String;
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

impl From<String> for CorrelationId {
    fn from(id: String) -> Self {
        CorrelationId::new(id)
    }
}

impl From<&str> for CorrelationId {
    fn from(id: &str) -> Self {
        CorrelationId::new(id)
    }
}

impl<T> From<T> for ExecuteAt<T> {
    fn from(value: T) -> Self {
        ExecuteAt::new(value)
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
    
    /// Validate required fields are present
    fn validate_required_fields(&self) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_correlation_id() {
        let corr_id = CorrelationId::new("test-123");
        assert_eq!(corr_id.as_str(), "test-123");
        assert_eq!(*corr_id, "test-123");
        
        let generated = CorrelationId::generate();
        assert!(generated.as_str().starts_with("corr_"));
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
        let corr_id = CorrelationId::new("serialize-test");
        let json = serde_json::to_string(&corr_id).unwrap();
        let deserialized: CorrelationId = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.as_str(), "serialize-test");
        
        let execute_at = ExecuteAt::<DateTime>::delay_seconds(60);
        let json = serde_json::to_string(&execute_at).unwrap();
        let deserialized: ExecuteAt<DateTime> = serde_json::from_str(&json).unwrap();
        match deserialized.get() {
            DateTime::RelativeSeconds(60) => {},
            _ => panic!("Serialization roundtrip failed"),
        }
    }
}