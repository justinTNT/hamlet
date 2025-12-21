
pub struct TestStorage {
    pub user_id: String,
    pub preferences: TestPreferences,
}

pub struct TestPreferences {
    pub theme: String,
    pub notifications: bool,
}
