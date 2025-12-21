use serde::{Deserialize, Serialize};
use elm_rs::{Elm, ElmDecode, ElmEncode};

// Default behavior: All fields are persistent (localStorage) unless explicitly wrapped
// No wrapper needed for persistent storage - it's the default

/// A browser storage field that expires when the session ends (sessionStorage)
/// Automatically cleared when tab/browser closes
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
#[repr(transparent)]
pub struct SessionOnly<T>(pub T);

/// A storage field that expires after a specific duration (with expiration logic)
/// Automatically expires and gets cleaned up
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct Expiring<T> {
    pub value: T,
    pub expires_at: u64, // timestamp
}

/// A storage field that syncs across tabs/windows via storage events
/// Changes in one tab automatically propagate to other tabs
/// Still persistent (localStorage) but with cross-tab synchronization
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
#[repr(transparent)]
pub struct CrossTab<T>(pub T);

/// A cached value that can be invalidated and refreshed
/// Still persistent by default, but includes cache metadata for intelligent refresh logic
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct Cached<T> {
    pub value: T,
    pub cached_at: u64,
    pub ttl_seconds: Option<u32>,
}

// Implementations for ergonomic usage

impl<T> SessionOnly<T> {
    pub fn new(value: T) -> Self {
        SessionOnly(value)
    }
    
    pub fn get(&self) -> &T {
        &self.0
    }
    
    pub fn into_inner(self) -> T {
        self.0
    }
}

impl<T> Expiring<T> {
    pub fn new(value: T, expires_in_seconds: u32) -> Self {
        let now = js_sys::Date::now() as u64 / 1000;
        Expiring {
            value,
            expires_at: now + expires_in_seconds as u64,
        }
    }
    
    pub fn is_expired(&self) -> bool {
        let now = js_sys::Date::now() as u64 / 1000;
        now > self.expires_at
    }
    
    pub fn get(&self) -> Option<&T> {
        if self.is_expired() {
            None
        } else {
            Some(&self.value)
        }
    }
    
    pub fn get_unchecked(&self) -> &T {
        &self.value
    }
}

impl<T> CrossTab<T> {
    pub fn new(value: T) -> Self {
        CrossTab(value)
    }
    
    pub fn get(&self) -> &T {
        &self.0
    }
    
    pub fn into_inner(self) -> T {
        self.0
    }
}

impl<T> Cached<T> {
    pub fn new(value: T, ttl_seconds: Option<u32>) -> Self {
        let now = js_sys::Date::now() as u64 / 1000;
        Cached {
            value,
            cached_at: now,
            ttl_seconds,
        }
    }
    
    pub fn is_stale(&self) -> bool {
        if let Some(ttl) = self.ttl_seconds {
            let now = js_sys::Date::now() as u64 / 1000;
            (now - self.cached_at) > ttl as u64
        } else {
            false
        }
    }
    
    pub fn get(&self) -> Option<&T> {
        if self.is_stale() {
            None
        } else {
            Some(&self.value)
        }
    }
    
    pub fn get_unchecked(&self) -> &T {
        &self.value
    }
    
    pub fn age_seconds(&self) -> u64 {
        let now = js_sys::Date::now() as u64 / 1000;
        now - self.cached_at
    }
}

// Deref implementations for transparent access
impl<T> std::ops::Deref for SessionOnly<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> std::ops::Deref for CrossTab<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

// From implementations for ergonomic construction
impl<T> From<T> for SessionOnly<T> {
    fn from(value: T) -> Self {
        SessionOnly::new(value)
    }
}

impl<T> From<T> for CrossTab<T> {
    fn from(value: T) -> Self {
        CrossTab::new(value)
    }
}

// Type aliases for common storage patterns
pub type SessionData<T> = SessionOnly<T>;      // Tab-specific data
pub type UserCache<T> = Cached<T>;             // User-specific cached data  
pub type Temporary<T> = Expiring<T>;           // Data that expires

// Combination types for advanced use cases
pub type SessionCache<T> = SessionOnly<Cached<T>>;   // Cached but session-only
pub type CrossTabCache<T> = CrossTab<Cached<T>>;     // Cached and synced across tabs

// Type aliases for common storage values
pub type StorageKey = String;                  // Storage key identifier
pub type JsonValue = serde_json::Value;        // Generic JSON storage

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_storage() {
        let session: SessionOnly<String> = "temp_data".to_string().into();
        assert_eq!(*session, "temp_data");
        assert_eq!(session.get(), "temp_data");
    }

    #[cfg(target_arch = "wasm32")]
    #[test]
    fn test_expiring_storage() {
        let mut expiring = Expiring::new("test_data".to_string(), 3600);
        assert!(!expiring.is_expired());
        assert_eq!(expiring.get(), Some(&"test_data".to_string()));
        
        // Manually expire
        expiring.expires_at = 0;
        assert!(expiring.is_expired());
        assert_eq!(expiring.get(), None);
    }

    #[cfg(target_arch = "wasm32")]
    #[test]
    fn test_cached_storage() {
        let cache = Cached::new("cached_value".to_string(), Some(60));
        assert!(!cache.is_stale());
        assert_eq!(cache.get(), Some(&"cached_value".to_string()));
        assert!(cache.age_seconds() >= 0);
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn test_storage_types_compilation() {
        // Just test that the types compile correctly on non-wasm targets
        let _session: SessionOnly<String> = SessionOnly::new("test".to_string());
        let _cross_tab: CrossTab<i32> = CrossTab::new(42);
        let _persistent_data = "persistent_by_default".to_string(); // Default is persistent
        println!("Storage types compile correctly");
    }
}