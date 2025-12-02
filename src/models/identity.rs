use horatio_macro::buildamp_domain;

#[buildamp_domain]
pub struct Guest {
    pub id: String,
    pub name: String,
    // Simplified auth for now
}
