
pub enum TestSSEEvent {
    UserConnected { user_id: String },
    UserDisconnected { user_id: String },
    MessageSent { content: String, sender: String },
}
