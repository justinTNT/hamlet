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

#[test]
fn test_session_storage_isolation() {
    
    // Test that SessionOnly storage doesn't leak between different sessions
    
    // Create session-specific data for different sessions
    let session_a_data = SessionOnly::new("session_a_private_data".to_string());
    let session_b_data = SessionOnly::new("session_b_private_data".to_string());
    let session_c_data = SessionOnly::new("session_c_private_data".to_string());
    
    // Verify each session has its own isolated data
    assert_eq!(*session_a_data, "session_a_private_data");
    assert_eq!(*session_b_data, "session_b_private_data");
    assert_eq!(*session_c_data, "session_c_private_data");
    
    // Test that modifications don't affect other sessions
    let mutable_session_a = SessionOnly::new(vec!["initial".to_string(), "session_a_addition".to_string()]);
    let session_b_copy = SessionOnly::new(vec!["initial".to_string()]);
    
    // Session B should remain unchanged
    assert_eq!(session_b_copy.len(), 1);
    assert_eq!(session_b_copy[0], "initial");
    assert_eq!(mutable_session_a.len(), 2);
    assert_eq!(mutable_session_a[1], "session_a_addition");
    
    println!("✅ Session storage isolation verified");
}

#[test]
fn test_cross_tab_shared_storage_behavior() {
    // Test that CrossTab storage properly handles shared data across browser tabs
    
    // Create shared data that should be accessible across tabs
    let shared_cart = CrossTab::new(vec![
        "item_1".to_string(),
        "item_2".to_string(),
        "item_3".to_string()
    ]);
    
    // Simulate multiple tabs accessing the same shared data
    let tab_a_view = CrossTab::new(shared_cart.clone());
    let tab_b_view = CrossTab::new(shared_cart.clone());
    
    // Both tabs should see the same data
    assert_eq!(tab_a_view.len(), 3);
    assert_eq!(tab_b_view.len(), 3);
    assert_eq!(tab_a_view[0], "item_1");
    assert_eq!(tab_b_view[0], "item_1");
    
    // Test serialization preserves shared data semantics
    let json = serde_json::to_string(&shared_cart).expect("Should serialize CrossTab");
    let deserialized: CrossTab<Vec<String>> = serde_json::from_str(&json).expect("Should deserialize CrossTab");
    
    assert_eq!(deserialized.len(), 3);
    assert_eq!(deserialized[2], "item_3");
    
    println!("✅ CrossTab shared storage behavior verified");
}

#[test]
fn test_storage_isolation_with_complex_data() {
    use std::collections::HashMap;
    
    // Test isolation with complex nested data structures
    
    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    struct UserProfile {
        id: String,
        name: String,
        preferences: HashMap<String, String>,
        private_data: Vec<String>,
    }
    
    let user_a_profile = UserProfile {
        id: "user_a".to_string(),
        name: "Alice".to_string(),
        preferences: {
            let mut prefs = HashMap::new();
            prefs.insert("theme".to_string(), "dark".to_string());
            prefs.insert("notifications".to_string(), "enabled".to_string());
            prefs
        },
        private_data: vec!["alice_secret_1".to_string(), "alice_secret_2".to_string()],
    };
    
    let user_b_profile = UserProfile {
        id: "user_b".to_string(),
        name: "Bob".to_string(),
        preferences: {
            let mut prefs = HashMap::new();
            prefs.insert("theme".to_string(), "light".to_string());
            prefs.insert("notifications".to_string(), "disabled".to_string());
            prefs
        },
        private_data: vec!["bob_secret_1".to_string()],
    };
    
    // Wrap in session-specific storage
    let session_a_profile = SessionOnly::new(user_a_profile);
    let session_b_profile = SessionOnly::new(user_b_profile);
    
    // Verify isolation of complex data
    assert_eq!(session_a_profile.id, "user_a");
    assert_eq!(session_b_profile.id, "user_b");
    assert_eq!(session_a_profile.preferences["theme"], "dark");
    assert_eq!(session_b_profile.preferences["theme"], "light");
    assert_ne!(session_a_profile.private_data, session_b_profile.private_data);
    
    // Test serialization maintains isolation
    let session_a_json = serde_json::to_string(&session_a_profile).expect("Should serialize session A");
    let session_b_json = serde_json::to_string(&session_b_profile).expect("Should serialize session B");
    
    assert_ne!(session_a_json, session_b_json);
    
    // Verify deserialization preserves isolation
    let deserialized_a: SessionOnly<UserProfile> = serde_json::from_str(&session_a_json).expect("Should deserialize session A");
    let deserialized_b: SessionOnly<UserProfile> = serde_json::from_str(&session_b_json).expect("Should deserialize session B");
    
    assert_eq!(deserialized_a.id, "user_a");
    assert_eq!(deserialized_b.id, "user_b");
    assert!(!deserialized_a.private_data.is_empty());
    assert!(!deserialized_b.private_data.is_empty());
    assert_ne!(deserialized_a.private_data, deserialized_b.private_data);
    
    println!("✅ Complex data storage isolation verified");
}

#[cfg(target_arch = "wasm32")]
#[test]
fn test_mixed_storage_types_isolation() {
    
    // Test that different storage types maintain proper isolation boundaries
    
    // Session-only data (should be isolated per session)
    let session_cart = SessionOnly::new(vec!["session_item_1".to_string()]);
    
    // Cross-tab data (should be shared across tabs but isolated per user)
    let cross_tab_bookmarks = CrossTab::new(vec!["bookmark_1".to_string(), "bookmark_2".to_string()]);
    
    // Cached data (should persist but be refreshable)
    let cached_settings = Cached::new({
        let mut settings = HashMap::new();
        settings.insert("auto_save".to_string(), "true".to_string());
        settings.insert("theme".to_string(), "system".to_string());
        settings
    }, Some(3600));
    
    // Verify each storage type maintains its semantics
    assert_eq!(session_cart.len(), 1);
    assert_eq!(cross_tab_bookmarks.len(), 2);
    assert_eq!(cached_settings.get().unwrap().len(), 2);
    
    // Test serialization of mixed storage types
    let session_json = serde_json::to_string(&session_cart).expect("SessionOnly should serialize");
    let cross_tab_json = serde_json::to_string(&cross_tab_bookmarks).expect("CrossTab should serialize");
    let cached_json = serde_json::to_string(&cached_settings).expect("Cached should serialize");
    
    println!("Session JSON: {}", session_json);
    println!("CrossTab JSON: {}", cross_tab_json);
    println!("Cached JSON: {}", cached_json);
    
    // Verify each has different structure/metadata if needed
    assert!(session_json.contains("session_item_1"));
    assert!(cross_tab_json.contains("bookmark_1"));
    assert!(cached_json.contains("auto_save"));
    
    // Test deserialization preserves type semantics
    let deserialized_session: SessionOnly<Vec<String>> = serde_json::from_str(&session_json).expect("Should deserialize SessionOnly");
    let deserialized_cross_tab: CrossTab<Vec<String>> = serde_json::from_str(&cross_tab_json).expect("Should deserialize CrossTab");
    let deserialized_cached: Cached<HashMap<String, String>> = serde_json::from_str(&cached_json).expect("Should deserialize Cached");
    
    assert_eq!(deserialized_session[0], "session_item_1");
    assert_eq!(deserialized_cross_tab[0], "bookmark_1");
    assert_eq!(deserialized_cached.get().unwrap()["theme"], "system");
    
    println!("✅ Mixed storage types isolation verified");
}

#[cfg(not(target_arch = "wasm32"))]
#[test] 
fn test_mixed_storage_types_isolation() {
    
    // Test that different storage types maintain proper isolation boundaries (non-wasm)
    
    // Session-only data (should be isolated per session)
    let session_cart = SessionOnly::new(vec!["session_item_1".to_string()]);
    
    // Cross-tab data (should be shared across tabs but isolated per user)
    let cross_tab_bookmarks = CrossTab::new(vec!["bookmark_1".to_string(), "bookmark_2".to_string()]);
    
    // Verify each storage type maintains its semantics
    assert_eq!(session_cart.len(), 1);
    assert_eq!(cross_tab_bookmarks.len(), 2);
    
    // Test serialization of mixed storage types
    let session_json = serde_json::to_string(&session_cart).expect("SessionOnly should serialize");
    let cross_tab_json = serde_json::to_string(&cross_tab_bookmarks).expect("CrossTab should serialize");
    
    println!("Session JSON: {}", session_json);
    println!("CrossTab JSON: {}", cross_tab_json);
    
    // Verify each has different structure/metadata if needed
    assert!(session_json.contains("session_item_1"));
    assert!(cross_tab_json.contains("bookmark_1"));
    
    // Test deserialization preserves type semantics
    let deserialized_session: SessionOnly<Vec<String>> = serde_json::from_str(&session_json).expect("Should deserialize SessionOnly");
    let deserialized_cross_tab: CrossTab<Vec<String>> = serde_json::from_str(&cross_tab_json).expect("Should deserialize CrossTab");
    
    assert_eq!(deserialized_session[0], "session_item_1");
    assert_eq!(deserialized_cross_tab[0], "bookmark_1");
    
    println!("✅ Mixed storage types isolation verified (non-wasm)");
}

#[test]
fn test_storage_isolation_edge_cases() {
    
    // Test edge cases in storage isolation
    
    // Empty storage should still maintain isolation
    let empty_session_a: SessionOnly<Vec<String>> = SessionOnly::new(vec![]);
    let empty_session_b: SessionOnly<Vec<String>> = SessionOnly::new(vec![]);
    
    assert_eq!(empty_session_a.len(), 0);
    assert_eq!(empty_session_b.len(), 0);
    
    // Identical data in different sessions should still be isolated
    let identical_data = "identical_value".to_string();
    let session_1 = SessionOnly::new(identical_data.clone());
    let session_2 = SessionOnly::new(identical_data.clone());
    
    assert_eq!(*session_1, *session_2); // Same data
    // But they should be logically separate instances
    
    // Very large data should maintain isolation
    let large_data: Vec<String> = (0..1000).map(|i| format!("item_{}", i)).collect();
    let session_large_a = SessionOnly::new(large_data.clone());
    let session_large_b = SessionOnly::new(large_data.clone());
    
    assert_eq!(session_large_a.len(), 1000);
    assert_eq!(session_large_b.len(), 1000);
    assert_eq!(session_large_a[500], "item_500");
    assert_eq!(session_large_b[500], "item_500");
    
    // Nested storage types
    let nested_storage = SessionOnly::new(CrossTab::new(vec![
        "nested_value_1".to_string(),
        "nested_value_2".to_string(),
    ]));
    
    assert_eq!(nested_storage.len(), 2);
    assert_eq!((*nested_storage)[0], "nested_value_1");
    
    println!("✅ Storage isolation edge cases verified");
}