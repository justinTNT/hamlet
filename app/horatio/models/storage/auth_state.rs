use crate::framework::storage_types::*;

pub struct AuthState {
    pub user_id: String,                    // Default = persistent
    pub session_token: Temporary<String>,   // Explicitly expiring
    pub permissions: UserCache<Vec<String>>, // Explicitly cached
}

