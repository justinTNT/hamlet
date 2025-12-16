use crate::framework::database_types::*;

pub struct Tag {
    pub id: DatabaseId<String>,
    pub name: String,
}