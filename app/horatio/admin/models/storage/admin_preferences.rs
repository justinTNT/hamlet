/// Admin UI preferences stored in browser localStorage
/// Includes column widths and other UI state
pub struct AdminPreferences {
    /// Column widths as JSON string, e.g. "table.column" -> width
    pub column_widths_json: String,
}
