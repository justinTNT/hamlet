use crate::framework::database_types::*;
use crate::framework::rich_content::RichContent;

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
    pub extract: Option<RichContent>,  // Now supports markdown/rich content
    pub owner_comment: RichContent,    // Now supports markdown/rich content
}
