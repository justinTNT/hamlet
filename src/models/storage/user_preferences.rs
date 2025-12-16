use crate::framework::storage_types::*;

pub struct Locale {
    pub language: String,           // Default = persistent localStorage
    pub timezone: String,           // Default = persistent localStorage
}

pub struct UserPreferences {
    pub theme: String,              // Default = persistent localStorage
    pub notifications: bool,        // Default = persistent localStorage
    pub locale: Locale,
}

