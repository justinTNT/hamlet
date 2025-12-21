use crate::framework::database_types::*;

pub struct MicroblogItem {
    pub id: DatabaseId<String>,
    pub data: JsonBlob<MicroblogItemData>,
    pub created_at: Timestamp,
    pub view_count: i32,
}

pub struct MicroblogItemData {
    pub title: String,
    pub link: Option<String>,
    pub image: Option<String>,
    pub extract: Option<String>,
    pub owner_comment: DefaultComment,
}
