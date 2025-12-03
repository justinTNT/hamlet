use horatio_macro::buildamp_domain;

#[buildamp_domain]
pub struct Tag {
    pub id: String,
    pub name: String,
}