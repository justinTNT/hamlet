pub struct Counter {
    pub value: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct Context {
    pub user_id: Option<String>,
    pub is_extension: bool,
}
