use crate::framework::database_types::*;

pub struct Tag {
    pub id: String, // UUID as string to match existing schema
    pub host: String,
    pub name: String,
}