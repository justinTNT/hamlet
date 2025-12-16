pub struct UserProfile {
    pub id: String,
    pub name: String,
    pub string: String,
}

pub struct UserSession {
    pub profile: UserProfile,
    pub login_time: i64,
    pub permissions: Vec<String>,
    pub ttl: u32,
}

