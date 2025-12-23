// All necessary imports handled by the derives

/// Rich content value type for fields that support formatted text
/// This is a value type, not a database entity
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub struct RichContent {
    /// Source content in the specified format
    pub content: String,
    
    /// Content format
    pub format: ContentFormat,
    
    /// Cached rendered HTML (optional, for performance)
    pub rendered_html: Option<String>,
}

/// Supported content formats for rich content
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema)]
pub enum ContentFormat {
    /// Markdown format - will be rendered to HTML
    Markdown,
    
    /// Raw HTML format - will be sanitized
    Html,
    
    /// Plain text format - will be escaped
    PlainText,
}

impl RichContent {
    /// Create new markdown content
    pub fn markdown(content: &str) -> Self {
        Self {
            content: content.to_string(),
            format: ContentFormat::Markdown,
            rendered_html: None,
        }
    }
    
    /// Create new HTML content
    pub fn html(content: &str) -> Self {
        Self {
            content: content.to_string(),
            format: ContentFormat::Html,
            rendered_html: Some(content.to_string()), // HTML is its own rendering
        }
    }
    
    /// Create new plain text content
    pub fn plaintext(content: &str) -> Self {
        Self {
            content: content.to_string(),
            format: ContentFormat::PlainText,
            rendered_html: Some(html_escape(content)),
        }
    }
    
    /// Get rendered HTML, generating if needed
    pub fn get_html(&self) -> String {
        match &self.rendered_html {
            Some(html) => html.clone(),
            None => self.render_to_html(),
        }
    }
    
    /// Render content to HTML based on format
    fn render_to_html(&self) -> String {
        match self.format {
            ContentFormat::Markdown => {
                // In a real implementation, this would use a markdown parser
                // For now, just wrap in <p> tags
                format!("<p>{}</p>", html_escape(&self.content))
            }
            ContentFormat::Html => {
                // In a real implementation, this would sanitize HTML
                self.content.clone()
            }
            ContentFormat::PlainText => {
                html_escape(&self.content)
            }
        }
    }
}

impl Default for RichContent {
    fn default() -> Self {
        Self::plaintext("")
    }
}

impl From<String> for RichContent {
    fn from(content: String) -> Self {
        Self::plaintext(&content)
    }
}

impl From<&str> for RichContent {
    fn from(content: &str) -> Self {
        Self::plaintext(content)
    }
}

/// Simple HTML escaping function
/// In a real implementation, you'd use a proper HTML escaping library
fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}