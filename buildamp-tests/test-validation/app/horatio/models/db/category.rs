use crate::framework::database_types::*;

pub struct Category {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}