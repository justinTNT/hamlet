pub struct GuestSession {
    pub guest_id: String,       // UUID for session tracking  
    pub display_name: String,   // e.g., "Guest2", "Guest47" 
    pub created_at: u64,        // timestamp when session created
}
