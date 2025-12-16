pub struct TestCache {
    pub key: String,
    pub data: String,
    pub ttl: u32,
}

pub struct UserSession {
    pub user_id: String,
    pub login_time: i64,
    pub permissions: Vec<String>,
    pub ttl: u32,
}

