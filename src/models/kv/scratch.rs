// KV store models  
// Auto-derives: Clone, Serialize, Deserialize, Debug (directory-based)
// TTL values define cache expiration in seconds

// Simple test cache for development
// TODO: Remove manual derive when directory-based generation is implemented
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TestCache {
    pub key: String,
    pub data: String,
    pub ttl: u32, // TTL in seconds
}

// User session storage
// TODO: Remove manual derive when directory-based generation is implemented
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserSession {
    pub user_id: String,
    pub login_time: i64,
    pub permissions: Vec<String>,
    pub ttl: u32, // 3600 = 1 hour
}

