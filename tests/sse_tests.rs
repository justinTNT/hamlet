use serde_json;

// Import our SSE event types - auto-discovered by BuildAmp
use proto_rust::events_sse_events::*;

#[test]
fn test_sse_event_serialization() {
    // Test NewPostEvent serialization
    let new_post = SSEEvent::NewPost(NewPostEvent {
        post_id: "post_123".to_string(),
        title: "Test Post".to_string(),
        author_name: "Test Author".to_string(),
        author_id: "author_123".to_string(),
        extract: Some("This is a test post".to_string()),
        tags: vec!["rust".to_string(), "testing".to_string()],
        timestamp: 1703123456789,
        link: Some("https://example.com".to_string()),
        image: None,
    });

    let json = serde_json::to_string(&new_post).expect("Failed to serialize NewPostEvent");
    let expected = r#"{"type":"NewPost","data":{"post_id":"post_123","title":"Test Post","author_name":"Test Author","author_id":"author_123","extract":"This is a test post","tags":["rust","testing"],"timestamp":1703123456789,"link":"https://example.com","image":null}}"#;
    
    assert_eq!(json, expected);
    
    // Test deserialization
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize NewPostEvent");
    match deserialized {
        SSEEvent::NewPost(event) => {
            assert_eq!(event.post_id, "post_123");
            assert_eq!(event.title, "Test Post");
            assert_eq!(event.tags.len(), 2);
        }
        _ => panic!("Expected NewPost variant"),
    }
}

#[test]
fn test_new_comment_event_serialization() {
    let new_comment = SSEEvent::NewComment(NewCommentEvent {
        comment_id: "comment_456".to_string(),
        post_id: "post_123".to_string(),
        parent_comment_id: Some("parent_789".to_string()),
        author_name: "Commenter".to_string(),
        author_id: "user_456".to_string(),
        text: "Great post!".to_string(),
        timestamp: 1703123456890,
    });

    let json = serde_json::to_string(&new_comment).expect("Failed to serialize NewCommentEvent");
    
    // Test round-trip serialization
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize NewCommentEvent");
    match deserialized {
        SSEEvent::NewComment(event) => {
            assert_eq!(event.comment_id, "comment_456");
            assert_eq!(event.post_id, "post_123");
            assert_eq!(event.parent_comment_id, Some("parent_789".to_string()));
            assert_eq!(event.text, "Great post!");
        }
        _ => panic!("Expected NewComment variant"),
    }
}

#[test]
fn test_user_presence_event_serialization() {
    let presence = SSEEvent::UserPresence(UserPresenceEvent {
        user_id: "user_789".to_string(),
        display_name: "John Doe".to_string(),
        status: "online".to_string(),
        last_seen: Some(1703123456000),
    });

    let json = serde_json::to_string(&presence).expect("Failed to serialize UserPresenceEvent");
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize UserPresenceEvent");
    
    match deserialized {
        SSEEvent::UserPresence(event) => {
            assert_eq!(event.user_id, "user_789");
            assert_eq!(event.display_name, "John Doe");
            assert_eq!(event.status, "online");
            assert_eq!(event.last_seen, Some(1703123456000));
        }
        _ => panic!("Expected UserPresence variant"),
    }
}

#[test]
fn test_typing_indicator_event_serialization() {
    let typing = SSEEvent::TypingIndicator(TypingIndicatorEvent {
        user_id: "user_999".to_string(),
        display_name: "Jane Smith".to_string(),
        post_id: "post_555".to_string(),
        is_typing: true,
        timestamp: 1703123457000,
    });

    let json = serde_json::to_string(&typing).expect("Failed to serialize TypingIndicatorEvent");
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize TypingIndicatorEvent");
    
    match deserialized {
        SSEEvent::TypingIndicator(event) => {
            assert_eq!(event.user_id, "user_999");
            assert_eq!(event.display_name, "Jane Smith");
            assert_eq!(event.post_id, "post_555");
            assert_eq!(event.is_typing, true);
        }
        _ => panic!("Expected TypingIndicator variant"),
    }
}

#[test]
fn test_deleted_events_serialization() {
    // Test PostDeleted
    let post_deleted = SSEEvent::PostDeleted(PostDeletedEvent {
        post_id: "post_to_delete".to_string(),
        author_id: "author_123".to_string(),
        timestamp: 1703123458000,
    });

    let json = serde_json::to_string(&post_deleted).expect("Failed to serialize PostDeletedEvent");
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize PostDeletedEvent");
    
    match deserialized {
        SSEEvent::PostDeleted(event) => {
            assert_eq!(event.post_id, "post_to_delete");
            assert_eq!(event.author_id, "author_123");
        }
        _ => panic!("Expected PostDeleted variant"),
    }

    // Test CommentDeleted
    let comment_deleted = SSEEvent::CommentDeleted(CommentDeletedEvent {
        comment_id: "comment_to_delete".to_string(),
        post_id: "parent_post".to_string(),
        author_id: "author_456".to_string(),
        timestamp: 1703123459000,
    });

    let json = serde_json::to_string(&comment_deleted).expect("Failed to serialize CommentDeletedEvent");
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize CommentDeletedEvent");
    
    match deserialized {
        SSEEvent::CommentDeleted(event) => {
            assert_eq!(event.comment_id, "comment_to_delete");
            assert_eq!(event.post_id, "parent_post");
            assert_eq!(event.author_id, "author_456");
        }
        _ => panic!("Expected CommentDeleted variant"),
    }
}

#[test]
fn test_sse_message_wrapper() {
    let event = SSEEvent::NewPost(NewPostEvent {
        post_id: "wrapped_post".to_string(),
        title: "Wrapped Test".to_string(),
        author_name: "Wrapper".to_string(),
        author_id: "wrap_123".to_string(),
        extract: None,
        tags: vec![],
        timestamp: 1703123460000,
        link: None,
        image: None,
    });

    let message = SSEMessage {
        id: "msg_123".to_string(),
        event,
        timestamp: 1703123460000,
        host: "example.com".to_string(),
    };

    let json = serde_json::to_string(&message).expect("Failed to serialize SSEMessage");
    let deserialized: SSEMessage = serde_json::from_str(&json).expect("Failed to deserialize SSEMessage");
    
    assert_eq!(deserialized.id, "msg_123");
    assert_eq!(deserialized.timestamp, 1703123460000);
    assert_eq!(deserialized.host, "example.com");
    
    match deserialized.event {
        SSEEvent::NewPost(post_event) => {
            assert_eq!(post_event.post_id, "wrapped_post");
            assert_eq!(post_event.title, "Wrapped Test");
        }
        _ => panic!("Expected NewPost in wrapper"),
    }
}

#[test]
fn test_optional_fields() {
    // Test NewPostEvent with minimal fields
    let minimal_post = SSEEvent::NewPost(NewPostEvent {
        post_id: "minimal".to_string(),
        title: "Minimal Post".to_string(),
        author_name: "Min".to_string(),
        author_id: "min_123".to_string(),
        extract: None,
        tags: vec![],
        timestamp: 1703123461000,
        link: None,
        image: None,
    });

    let json = serde_json::to_string(&minimal_post).expect("Failed to serialize minimal post");
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize minimal post");
    
    match deserialized {
        SSEEvent::NewPost(event) => {
            assert_eq!(event.extract, None);
            assert_eq!(event.tags.len(), 0);
            assert_eq!(event.link, None);
            assert_eq!(event.image, None);
        }
        _ => panic!("Expected NewPost variant"),
    }

    // Test NewCommentEvent without parent
    let root_comment = SSEEvent::NewComment(NewCommentEvent {
        comment_id: "root_comment".to_string(),
        post_id: "some_post".to_string(),
        parent_comment_id: None,
        author_name: "Rooter".to_string(),
        author_id: "root_123".to_string(),
        text: "Root comment".to_string(),
        timestamp: 1703123462000,
    });

    let json = serde_json::to_string(&root_comment).expect("Failed to serialize root comment");
    let deserialized: SSEEvent = serde_json::from_str(&json).expect("Failed to deserialize root comment");
    
    match deserialized {
        SSEEvent::NewComment(event) => {
            assert_eq!(event.parent_comment_id, None);
        }
        _ => panic!("Expected NewComment variant"),
    }
}

#[test]
fn test_elm_compatibility() {
    // Test that our JSON structure matches what Elm expects
    let event = SSEEvent::NewPost(NewPostEvent {
        post_id: "elm_test".to_string(),
        title: "Elm Compatible".to_string(),
        author_name: "Elm Dev".to_string(),
        author_id: "elm_123".to_string(),
        extract: Some("Testing Elm compatibility".to_string()),
        tags: vec!["elm".to_string()],
        timestamp: 1703123463000,
        link: None,
        image: None,
    });

    let json = serde_json::to_string(&event).expect("Failed to serialize for Elm");
    
    // Parse as generic JSON to verify structure
    let parsed: serde_json::Value = serde_json::from_str(&json).expect("Failed to parse JSON");
    
    // Verify tagged union structure that Elm expects
    assert_eq!(parsed["type"], "NewPost");
    assert!(parsed["data"].is_object());
    assert_eq!(parsed["data"]["post_id"], "elm_test");
    assert_eq!(parsed["data"]["title"], "Elm Compatible");
    assert_eq!(parsed["data"]["author_name"], "Elm Dev");
    assert_eq!(parsed["data"]["tags"][0], "elm");
}