use crate::framework::database_types::*;

pub struct ItemTag {
    pub item_id: String,
    pub tag_id: String, // UUID as string to match existing schema
}