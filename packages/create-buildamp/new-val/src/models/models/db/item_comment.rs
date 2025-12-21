use crate::framework::database_types::*;

pub struct ItemComment {
    pub id: DatabaseId<String>,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub created_at: Timestamp,
}
