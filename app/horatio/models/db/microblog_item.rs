use crate::framework::database_types::*;
use crate::framework::rich_content::RichContent;

pub struct MicroblogItem {
    pub id: DatabaseId<String>,
    pub title: String,
    pub link: Option<String>,
    pub image: Option<String>,
    pub extract: Option<RichContent>,
    pub owner_comment: RichContent,
    pub created_at: Timestamp,
    pub view_count: i32,
}
