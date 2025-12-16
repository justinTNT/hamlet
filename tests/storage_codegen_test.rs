// Test for storage codegen functionality - naked structs with storage type semantics
use serde_json;
use proto_rust::*;

// Import storage types for testing
use proto_rust::framework::storage_types::*;

// Define naked storage structures for testing - auto-discovery would apply decorations
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, BuildAmpElm)]
pub struct TestUserPreferences {
    pub theme: String,              // Default = persistent localStorage
    pub notifications: bool,        // Default = persistent localStorage
    pub language: String,           // Default = persistent localStorage
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, BuildAmpElm)]
pub struct TestSessionData {
    pub scroll_position: SessionData<f64>,     // Explicitly session-only
    pub selected_item: SessionData<String>,   // Explicitly session-only
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, BuildAmpElm)]
pub struct TestCrossTabs {
    pub sidebar_collapsed: CrossTab<bool>,    // Explicitly cross-tab synced
    pub active_workspace: CrossTab<String>,  // Explicitly cross-tab synced
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, BuildAmpElm)]
pub struct TestCache {
    pub user_data: UserCache<Vec<String>>,   // Explicitly cached
    pub temp_files: Temporary<Vec<String>>,  // Explicitly expiring
}

#[test]
fn test_storage_codegen_serialization() {
    // Test that naked structs get proper serialization through macro
    let prefs = TestUserPreferences {
        theme: "dark".to_string(),
        notifications: true,
        language: "en".to_string(),
    };

    // Should serialize cleanly - storage behavior handled by framework
    let json = serde_json::to_string(&prefs).expect("Failed to serialize user preferences");
    println!("Serialized preferences: {}", json);
    
    // Should deserialize back properly  
    let deserialized: TestUserPreferences = serde_json::from_str(&json)
        .expect("Failed to deserialize user preferences");
    
    assert_eq!(deserialized.theme, "dark");
    assert_eq!(deserialized.notifications, true);
    assert_eq!(deserialized.language, "en");
}

#[test]
fn test_storage_types_behavior() {
    // Test session-only storage types
    let session_data = TestSessionData {
        scroll_position: SessionData::new(142.5),
        selected_item: SessionData::new("item-123".to_string()),
    };
    
    // Should serialize with storage type metadata
    let json = serde_json::to_string(&session_data).expect("Failed to serialize session data");
    println!("Serialized session data: {}", json);
    
    // Access through deref should work transparently
    assert_eq!(*session_data.scroll_position, 142.5);
    assert_eq!(*session_data.selected_item, "item-123");
}

#[test] 
fn test_cross_tab_storage() {
    // Test cross-tab synchronized storage
    let cross_tab = TestCrossTabs {
        sidebar_collapsed: CrossTab::new(true),
        active_workspace: CrossTab::new("main".to_string()),
    };
    
    let json = serde_json::to_string(&cross_tab).expect("Failed to serialize cross-tab data");
    
    // Parse as generic JSON to verify structure
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse JSON");
    
    // Should contain the wrapped values
    assert_eq!(parsed["sidebar_collapsed"], true);
    assert_eq!(parsed["active_workspace"], "main");
}

#[cfg(target_arch = "wasm32")]
#[test]
fn test_cached_storage() {
    // Test cached storage with TTL (wasm-only due to js_sys::Date usage)
    let cache = TestCache {
        user_data: UserCache::new(vec!["data1".to_string(), "data2".to_string()], Some(3600)),
        temp_files: Temporary::new(vec!["temp1.txt".to_string()], 1800),
    };
    
    let json = serde_json::to_string(&cache).expect("Failed to serialize cached data");
    
    // Verify cache metadata is included
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse JSON");
    assert!(parsed["user_data"]["cached_at"].is_number());
    assert!(parsed["temp_files"]["expires_at"].is_number());
    
    // Verify cache isn't stale initially
    assert!(!cache.user_data.is_stale());
    assert!(!cache.temp_files.is_expired());
}

#[cfg(not(target_arch = "wasm32"))]
#[test]
fn test_cached_storage_compilation() {
    // Just test that cached storage types compile on non-wasm targets
    println!("Cached storage types compile correctly on non-wasm targets");
}

#[test]
fn test_default_persistence() {
    // Test that naked String/bool fields get default persistent behavior
    let prefs = TestUserPreferences {
        theme: "light".to_string(),
        notifications: false, 
        language: "es".to_string(),
    };
    
    // All fields should serialize as simple values (persistence handled by framework)
    let json = serde_json::to_string(&prefs).expect("Failed to serialize");
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse");
    
    // Should be simple values, not wrapped in storage metadata
    assert_eq!(parsed["theme"], "light");
    assert_eq!(parsed["notifications"], false);
    assert_eq!(parsed["language"], "es");
    
    // Framework should automatically handle localStorage for these
    println!("Default persistent fields: {}", json);
}