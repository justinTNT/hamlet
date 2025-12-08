// Server-Sent Event types for microblog real-time updates
// Following BuildAmp file organization strategy - filename determines behavior

use serde::{Deserialize, Serialize};

// Real-time events that should be pushed to browsers via SSE
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum SSEEvent {
    NewPost(NewPostEvent),
    NewComment(NewCommentEvent),
    PostDeleted(PostDeletedEvent),
    CommentDeleted(CommentDeletedEvent),
    UserPresence(UserPresenceEvent),
    TypingIndicator(TypingIndicatorEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewPostEvent {
    pub post_id: String,
    pub title: String,
    pub author_name: String,
    pub author_id: String,
    pub extract: Option<String>,
    pub tags: Vec<String>,
    pub timestamp: i64,
    pub link: Option<String>,
    pub image: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewCommentEvent {
    pub comment_id: String,
    pub post_id: String,
    pub parent_comment_id: Option<String>,
    pub author_name: String,
    pub author_id: String,
    pub text: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostDeletedEvent {
    pub post_id: String,
    pub author_id: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentDeletedEvent {
    pub comment_id: String,
    pub post_id: String,
    pub author_id: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPresenceEvent {
    pub user_id: String,
    pub display_name: String,
    pub status: String, // "online", "offline", "away"
    pub last_seen: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingIndicatorEvent {
    pub user_id: String,
    pub display_name: String,
    pub post_id: String,
    pub is_typing: bool,
    pub timestamp: i64,
}

// SSE message wrapper for transmission
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSEMessage {
    pub id: String,
    pub event: SSEEvent,
    pub timestamp: i64,
    pub host: String, // tenant isolation
}