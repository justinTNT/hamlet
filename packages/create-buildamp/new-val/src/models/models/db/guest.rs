use crate::framework::database_types::*;

pub struct Guest {
    pub id: DatabaseId<String>,
    pub name: String,
    pub picture: String,
    pub session_id: String,
    pub created_at: Timestamp,
}
