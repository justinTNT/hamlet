// Background event types for notifications and email processing
// Following BuildAmp file organization strategy - filename determines behavior

// Welcome email sequence events
pub struct SendWelcomeEmail {
    pub email: String,
    pub name: String,
    pub delay_minutes: u32,
}

pub struct SendPasswordReset {
    pub user_id: String,
    pub reset_token: String,
    pub delay_minutes: u32,
}

// Comment notification events
pub struct NotifyCommentAdded {
    pub comment_id: String,
    pub item_id: String,
    pub author_name: String,
    pub item_owner_email: Option<String>,
    pub delay_minutes: u32,
}

pub struct NotifyCommentReply {
    pub comment_id: String,
    pub parent_comment_id: String,
    pub parent_author_email: Option<String>,
    pub reply_author_name: String,
    pub delay_minutes: u32,
}

// Digest and summary events
pub struct GenerateUserDigest {
    pub user_email: String,
    pub period_start: i64,
    pub period_end: i64,
    pub delay_minutes: u32,
}