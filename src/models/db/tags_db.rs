use crate::framework::database_types::*;
use horatio_macro::buildamp_domain;

// Database model - generates SQL queries automatically (no macro needed)
// TODO: Remove buildamp_domain when directory-based generation is implemented
#[buildamp_domain]
pub struct Tag {
    pub id: DatabaseId<String>,
    pub name: String,
}