use serde_json;

// Import our SSE event types - auto-discovered by BuildAmp
// Each event type is now a separate naked struct  
use proto_rust::sse_new_post_event::NewPostEvent;
use proto_rust::sse_new_comment_event::NewCommentEvent;
use proto_rust::sse_user_presence_event::UserPresenceEvent;
use proto_rust::sse_typing_indicator_event::TypingIndicatorEvent;
use proto_rust::sse_post_deleted_event::PostDeletedEvent;
use proto_rust::sse_comment_deleted_event::CommentDeletedEvent;

#[test]
fn test_new_post_event_serialization() {
    // Test NewPostEvent serialization - now a naked struct
    let new_post = NewPostEvent {
        post_id: "post_123".to_string(),
        title: "Test Post".to_string(),
        author_name: "Test Author".to_string(),
        author_id: "author_123".to_string(),
        extract: Some("This is a test post".to_string()),
        tags: vec!["rust".to_string(), "testing".to_string()],
        timestamp: 1703123456789,
        link: Some("https://example.com".to_string()),
        image: None,
    };

    let json = serde_json::to_string(&new_post).expect("Failed to serialize NewPostEvent");
    println!("NewPostEvent JSON: {}", json);
    
    // Test deserialization
    let deserialized: NewPostEvent = serde_json::from_str(&json).expect("Failed to deserialize NewPostEvent");
    assert_eq!(deserialized.post_id, "post_123");
    assert_eq!(deserialized.title, "Test Post");
    assert_eq!(deserialized.author_name, "Test Author");
    assert_eq!(deserialized.tags.len(), 2);
    assert_eq!(deserialized.extract, Some("This is a test post".to_string()));
}

#[test]
fn test_new_comment_event_serialization() {
    let new_comment = NewCommentEvent {
        comment_id: "comment_456".to_string(),
        post_id: "post_123".to_string(),
        parent_comment_id: Some("parent_789".to_string()),
        author_name: "Commenter".to_string(),
        author_id: "user_456".to_string(),
        text: "Great post!".to_string(),
        timestamp: 1703123456890,
    };

    let json = serde_json::to_string(&new_comment).expect("Failed to serialize NewCommentEvent");
    println!("NewCommentEvent JSON: {}", json);
    
    // Test round-trip serialization
    let deserialized: NewCommentEvent = serde_json::from_str(&json).expect("Failed to deserialize NewCommentEvent");
    assert_eq!(deserialized.comment_id, "comment_456");
    assert_eq!(deserialized.post_id, "post_123");
    assert_eq!(deserialized.parent_comment_id, Some("parent_789".to_string()));
    assert_eq!(deserialized.text, "Great post!");
    assert_eq!(deserialized.author_name, "Commenter");
}

#[test]
fn test_user_presence_event_serialization() {
    let presence = UserPresenceEvent {
        user_id: "user_789".to_string(),
        display_name: "John Doe".to_string(),
        status: "online".to_string(),
        last_seen: Some(1703123456000),
    };

    let json = serde_json::to_string(&presence).expect("Failed to serialize UserPresenceEvent");
    println!("UserPresenceEvent JSON: {}", json);
    
    let deserialized: UserPresenceEvent = serde_json::from_str(&json).expect("Failed to deserialize UserPresenceEvent");
    assert_eq!(deserialized.user_id, "user_789");
    assert_eq!(deserialized.display_name, "John Doe");
    assert_eq!(deserialized.status, "online");
    assert_eq!(deserialized.last_seen, Some(1703123456000));
}

#[test]
fn test_typing_indicator_event_serialization() {
    let typing = TypingIndicatorEvent {
        user_id: "user_999".to_string(),
        display_name: "Jane Smith".to_string(),
        post_id: "post_555".to_string(),
        is_typing: true,
        timestamp: 1703123457000,
    };

    let json = serde_json::to_string(&typing).expect("Failed to serialize TypingIndicatorEvent");
    println!("TypingIndicatorEvent JSON: {}", json);
    
    let deserialized: TypingIndicatorEvent = serde_json::from_str(&json).expect("Failed to deserialize TypingIndicatorEvent");
    assert_eq!(deserialized.user_id, "user_999");
    assert_eq!(deserialized.display_name, "Jane Smith");
    assert_eq!(deserialized.post_id, "post_555");
    assert_eq!(deserialized.is_typing, true);
    assert_eq!(deserialized.timestamp, 1703123457000);
}

#[test]
fn test_deleted_events_serialization() {
    // Test PostDeletedEvent
    let post_deleted = PostDeletedEvent {
        post_id: "post_to_delete".to_string(),
        author_id: "author_123".to_string(),
        timestamp: 1703123458000,
    };

    let json = serde_json::to_string(&post_deleted).expect("Failed to serialize PostDeletedEvent");
    println!("PostDeletedEvent JSON: {}", json);
    
    let deserialized: PostDeletedEvent = serde_json::from_str(&json).expect("Failed to deserialize PostDeletedEvent");
    assert_eq!(deserialized.post_id, "post_to_delete");
    assert_eq!(deserialized.author_id, "author_123");
    assert_eq!(deserialized.timestamp, 1703123458000);

    // Test CommentDeletedEvent
    let comment_deleted = CommentDeletedEvent {
        comment_id: "comment_to_delete".to_string(),
        post_id: "parent_post".to_string(),
        author_id: "author_456".to_string(),
        timestamp: 1703123459000,
    };

    let json = serde_json::to_string(&comment_deleted).expect("Failed to serialize CommentDeletedEvent");
    println!("CommentDeletedEvent JSON: {}", json);
    
    let deserialized: CommentDeletedEvent = serde_json::from_str(&json).expect("Failed to deserialize CommentDeletedEvent");
    assert_eq!(deserialized.comment_id, "comment_to_delete");
    assert_eq!(deserialized.post_id, "parent_post");
    assert_eq!(deserialized.author_id, "author_456");
    assert_eq!(deserialized.timestamp, 1703123459000);
}

#[test]
fn test_sse_events_without_wrappers() {
    // Test that individual events work without SSEEvent enum wrapper
    let events: Vec<serde_json::Value> = vec![
        serde_json::to_value(&NewPostEvent {
            post_id: "no_wrapper_post".to_string(),
            title: "Direct Event".to_string(),
            author_name: "Direct".to_string(),
            author_id: "direct_123".to_string(),
            extract: None,
            tags: vec![],
            timestamp: 1703123460000,
            link: None,
            image: None,
        }).unwrap(),
        
        serde_json::to_value(&NewCommentEvent {
            comment_id: "no_wrapper_comment".to_string(),
            post_id: "some_post".to_string(),
            parent_comment_id: None,
            author_name: "Direct Commenter".to_string(),
            author_id: "direct_456".to_string(),
            text: "Direct comment".to_string(),
            timestamp: 1703123461000,
        }).unwrap(),
        
        serde_json::to_value(&UserPresenceEvent {
            user_id: "direct_presence".to_string(),
            display_name: "Present User".to_string(),
            status: "active".to_string(),
            last_seen: None,
        }).unwrap(),
    ];

    // Each event should serialize independently without wrappers
    for (i, event_json) in events.iter().enumerate() {
        println!("Direct event {}: {}", i, event_json);
        assert!(event_json.is_object());
        // No "type" or "data" wrapper fields - just the pure event data
        assert!(!event_json.as_object().unwrap().contains_key("type"));
        assert!(!event_json.as_object().unwrap().contains_key("data"));
    }
}

#[test]
fn test_optional_fields() {
    // Test NewPostEvent with minimal fields
    let minimal_post = NewPostEvent {
        post_id: "minimal".to_string(),
        title: "Minimal Post".to_string(),
        author_name: "Min".to_string(),
        author_id: "min_123".to_string(),
        extract: None,
        tags: vec![],
        timestamp: 1703123461000,
        link: None,
        image: None,
    };

    let json = serde_json::to_string(&minimal_post).expect("Failed to serialize minimal post");
    println!("Minimal post JSON: {}", json);
    
    let deserialized: NewPostEvent = serde_json::from_str(&json).expect("Failed to deserialize minimal post");
    assert_eq!(deserialized.extract, None);
    assert_eq!(deserialized.tags.len(), 0);
    assert_eq!(deserialized.link, None);
    assert_eq!(deserialized.image, None);

    // Test NewCommentEvent without parent
    let root_comment = NewCommentEvent {
        comment_id: "root_comment".to_string(),
        post_id: "some_post".to_string(),
        parent_comment_id: None,
        author_name: "Rooter".to_string(),
        author_id: "root_123".to_string(),
        text: "Root comment".to_string(),
        timestamp: 1703123462000,
    };

    let json = serde_json::to_string(&root_comment).expect("Failed to serialize root comment");
    println!("Root comment JSON: {}", json);
    
    let deserialized: NewCommentEvent = serde_json::from_str(&json).expect("Failed to deserialize root comment");
    assert_eq!(deserialized.parent_comment_id, None);
}

#[test]
fn test_elm_compatibility() {
    // Test that our naked structs produce clean JSON for Elm
    let event = NewPostEvent {
        post_id: "elm_test".to_string(),
        title: "Elm Compatible".to_string(),
        author_name: "Elm Dev".to_string(),
        author_id: "elm_123".to_string(),
        extract: Some("Testing Elm compatibility".to_string()),
        tags: vec!["elm".to_string()],
        timestamp: 1703123463000,
        link: None,
        image: None,
    };

    let json = serde_json::to_string(&event).expect("Failed to serialize for Elm");
    println!("Elm compatible JSON: {}", json);
    
    // Parse as generic JSON to verify structure
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse JSON");
    
    // Should be a simple flat object without wrapper types
    assert!(parsed.is_object());
    assert_eq!(parsed["post_id"], "elm_test");
    assert_eq!(parsed["title"], "Elm Compatible");
    assert_eq!(parsed["author_name"], "Elm Dev");
    assert_eq!(parsed["tags"][0], "elm");
    
    // No wrapper fields - clean direct data structure
    assert!(!parsed.as_object().unwrap().contains_key("type"));
    assert!(!parsed.as_object().unwrap().contains_key("data"));
    assert!(!parsed.as_object().unwrap().contains_key("event"));
}