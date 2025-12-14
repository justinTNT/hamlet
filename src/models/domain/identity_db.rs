use crate::framework::database_types::*;
use horatio_macro::buildamp_domain;

#[buildamp_domain]
pub struct Guest {
    pub id: DatabaseId<String>,
    pub session_id: String,
    pub created_at: Timestamp,
}