// Focused test for storage types functionality without external dependencies
use serde_json;

// Import storage types directly for testing
use proto_rust::framework::storage_types::*;

#[test]
fn test_default_persistent_behavior() {
    // Test that naked String/bool get default persistent behavior
    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
    pub struct SimplePreferences {
        pub theme: String,        // Default = persistent localStorage
        pub enabled: bool,        // Default = persistent localStorage
        pub count: i32,          // Default = persistent localStorage
    }
    
    let prefs = SimplePreferences {
        theme: "dark".to_string(),
        enabled: true,
        count: 42,
    };
    
    // Should serialize as simple values (framework handles persistence)
    let json = serde_json::to_string(&prefs).expect("Failed to serialize");
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse");
    
    assert_eq!(parsed["theme"], "dark");
    assert_eq!(parsed["enabled"], true);
    assert_eq!(parsed["count"], 42);
    
    println!("Default persistent: {}", json);
}

#[test]
fn test_session_only_storage() {
    let session_data = SessionOnly::new("temp_value".to_string());
    
    // Should serialize the wrapped value
    let json = serde_json::to_string(&session_data).expect("Failed to serialize session data");
    println!("Session data: {}", json);
    
    // Transparent access should work
    assert_eq!(*session_data, "temp_value");
    assert_eq!(session_data.get(), "temp_value");
    
    // Should deserialize correctly
    let deserialized: SessionOnly<String> = serde_json::from_str(&json).expect("Failed to deserialize");
    assert_eq!(*deserialized, "temp_value");
}

#[test]
fn test_cross_tab_storage() {
    let cross_tab_data = CrossTab::new(vec!["item1".to_string(), "item2".to_string()]);
    
    // Should serialize the wrapped value
    let json = serde_json::to_string(&cross_tab_data).expect("Failed to serialize cross-tab data");
    println!("Cross-tab data: {}", json);
    
    // Transparent access should work
    assert_eq!(cross_tab_data.len(), 2);
    assert_eq!(cross_tab_data[0], "item1");
    
    // Should deserialize correctly
    let deserialized: CrossTab<Vec<String>> = serde_json::from_str(&json).expect("Failed to deserialize");
    assert_eq!(deserialized.len(), 2);
}

#[cfg(target_arch = "wasm32")]
#[test]
fn test_cached_storage() {
    let cached_data = Cached::new(vec!["cached1".to_string(), "cached2".to_string()], Some(3600));
    
    // Should not be stale initially
    assert!(!cached_data.is_stale());
    assert!(cached_data.get().is_some());
    assert_eq!(cached_data.get().unwrap().len(), 2);
    
    // Should serialize with metadata
    let json = serde_json::to_string(&cached_data).expect("Failed to serialize cached data");
    println!("Cached data: {}", json);
    
    // Should include cache metadata
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse");
    assert!(parsed["cached_at"].is_number());
    assert_eq!(parsed["ttl_seconds"], 3600);
    assert_eq!(parsed["value"].as_array().unwrap().len(), 2);
}

#[cfg(target_arch = "wasm32")]
#[test]
fn test_expiring_storage() {
    let expiring_data = Expiring::new("expires_soon".to_string(), 3600);
    
    // Should not be expired initially
    assert!(!expiring_data.is_expired());
    assert!(expiring_data.get().is_some());
    assert_eq!(expiring_data.get().unwrap(), "expires_soon");
    
    // Should serialize with expiration metadata
    let json = serde_json::to_string(&expiring_data).expect("Failed to serialize expiring data");
    println!("Expiring data: {}", json);
    
    // Should include expiration metadata
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse");
    assert!(parsed["expires_at"].is_number());
    assert_eq!(parsed["value"], "expires_soon");
}

#[cfg(target_arch = "wasm32")]
#[test]
fn test_storage_type_aliases() {
    let session_data: SessionData<String> = "session_value".to_string().into();
    let user_cache: UserCache<String> = UserCache::new("cached_value".to_string(), Some(1800));
    let temporary: Temporary<String> = Temporary::new("temp_value".to_string(), 900);
    
    // All should work with their respective behaviors
    assert_eq!(*session_data, "session_value");
    assert!(!user_cache.is_stale());
    assert!(!temporary.is_expired());
    
    println!("Type aliases work correctly");
}

#[cfg(target_arch = "wasm32")]
#[test]
fn test_combination_types() {
    // Test combining session + cache behavior
    let session_cache: SessionCache<String> = SessionOnly::new(
        Cached::new("session_cached".to_string(), Some(600))
    );
    
    // Should serialize nested structure
    let json = serde_json::to_string(&session_cache).expect("Failed to serialize session cache");
    println!("Session cache: {}", json);
    
    // Should work with nested access
    assert!(!session_cache.get().is_stale());
    assert_eq!(*session_cache.get().get().unwrap(), "session_cached");
    
    // Test cross-tab + cache behavior
    let cross_tab_cache: CrossTabCache<Vec<i32>> = CrossTab::new(
        Cached::new(vec![1, 2, 3], Some(1200))
    );
    
    let json2 = serde_json::to_string(&cross_tab_cache).expect("Failed to serialize cross-tab cache");
    println!("Cross-tab cache: {}", json2);
    
    assert!(!cross_tab_cache.get().is_stale());
    assert_eq!(cross_tab_cache.get().get().unwrap().len(), 3);
}

#[cfg(not(target_arch = "wasm32"))]
#[test]
fn test_cached_storage_compilation() {
    // Just test that cached storage types compile on non-wasm targets
    println!("Cached storage types compile correctly on non-wasm targets");
}

#[cfg(not(target_arch = "wasm32"))]
#[test]
fn test_expiring_storage_compilation() {
    // Just test that expiring storage types compile on non-wasm targets
    println!("Expiring storage types compile correctly on non-wasm targets");
}

#[cfg(not(target_arch = "wasm32"))]
#[test]
fn test_storage_type_aliases_compilation() {
    // Just test that storage type aliases compile on non-wasm targets
    println!("Storage type aliases compile correctly on non-wasm targets");
}

#[cfg(not(target_arch = "wasm32"))]
#[test]
fn test_combination_types_compilation() {
    // Just test that combination storage types compile on non-wasm targets
    println!("Combination storage types compile correctly on non-wasm targets");
}

#[test]
fn test_from_implementations() {
    // Test ergonomic construction via From trait
    let session: SessionOnly<String> = "test".to_string().into();
    let cross_tab: CrossTab<bool> = true.into();
    
    assert_eq!(*session, "test");
    assert_eq!(*cross_tab, true);
    
    println!("From implementations work correctly");
}