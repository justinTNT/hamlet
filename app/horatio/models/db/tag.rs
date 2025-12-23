use crate::framework::database_types::*;

pub struct Tag {
    pub id: DatabaseId<String>, // Primary key, auto-generated UUID
    pub host: String,
    pub name: String,
}