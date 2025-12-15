
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct VecExample {
    pub tags: Vec<String>,
    pub numbers: Vec<i32>,
    pub flags: Vec<bool>,
    pub nested_lists: Vec<Vec<String>>,
}
