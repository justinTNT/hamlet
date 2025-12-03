use crate::framework::database_types::*;
use horatio_macro::buildamp_domain;

#[buildamp_domain]
pub struct Tag {
    pub id: DatabaseId<String>,
    pub name: String,
}