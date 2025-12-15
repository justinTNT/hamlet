// Simple background events for testing the event system

// Welcome email event
pub struct SendWelcomeEmail {
    pub email: String,
    pub name: String,
    pub user_id: String,
}

// File processing event  
pub struct ProcessUpload {
    pub file_id: String,
    pub process_type: String,
}