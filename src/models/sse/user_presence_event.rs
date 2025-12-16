pub struct UserPresenceEvent {
    pub user_id: String,
    pub display_name: String,
    pub status: String,
    pub last_seen: Option<i64>,
}