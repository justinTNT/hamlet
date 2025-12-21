use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::marker::PhantomData;

// Note: Elm derivation for generic types with const parameters is complex
// For now, we'll handle Elm generation manually in the macro system
// The types will be generated as simple wrappers in Elm

/// Core validation type constructors for boundary validation
/// These provide JSON transport safety without business logic

/// Bounded validation for ranges (length for strings, value for numbers)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Bounded<T, const MIN: usize, const MAX: usize> {
    pub value: T,
    _marker: PhantomData<()>,
}

impl<T, const MIN: usize, const MAX: usize> Bounded<T, MIN, MAX> {
    pub fn new(value: T) -> Result<Self, ValidationError>
    where
        T: BoundedValidation,
    {
        if value.validate_bounds(MIN, MAX) {
            Ok(Self {
                value,
                _marker: PhantomData,
            })
        } else {
            Err(ValidationError::OutOfBounds { min: MIN, max: MAX })
        }
    }

    pub fn into_inner(self) -> T {
        self.value
    }

    pub fn as_ref(&self) -> &T {
        &self.value
    }
}

/// Format validation for standard formats
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Format<T, F> {
    pub value: T,
    _format: PhantomData<F>,
}

impl<T, F> Format<T, F> {
    pub fn new(value: T) -> Result<Self, ValidationError>
    where
        T: FormatValidation<F>,
    {
        if value.validate_format() {
            Ok(Self {
                value,
                _format: PhantomData,
            })
        } else {
            Err(ValidationError::InvalidFormat {
                expected: std::any::type_name::<F>().to_string(),
            })
        }
    }

    pub fn into_inner(self) -> T {
        self.value
    }

    pub fn as_ref(&self) -> &T {
        &self.value
    }
}

/// Character set validation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CharSet<T, C> {
    pub value: T,
    _charset: PhantomData<C>,
}

impl<T, C> CharSet<T, C> {
    pub fn new(value: T) -> Result<Self, ValidationError>
    where
        T: CharSetValidation<C>,
    {
        if value.validate_charset() {
            Ok(Self {
                value,
                _charset: PhantomData,
            })
        } else {
            Err(ValidationError::InvalidCharSet {
                expected: std::any::type_name::<C>().to_string(),
            })
        }
    }

    pub fn into_inner(self) -> T {
        self.value
    }

    pub fn as_ref(&self) -> &T {
        &self.value
    }
}

/// Encoding validation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Encoding<T, E> {
    pub value: T,
    _encoding: PhantomData<E>,
}

impl<T, E> Encoding<T, E> {
    pub fn new(value: T) -> Result<Self, ValidationError>
    where
        T: EncodingValidation<E>,
    {
        if value.validate_encoding() {
            Ok(Self {
                value,
                _encoding: PhantomData,
            })
        } else {
            Err(ValidationError::InvalidEncoding {
                expected: std::any::type_name::<E>().to_string(),
            })
        }
    }

    pub fn into_inner(self) -> T {
        self.value
    }

    pub fn as_ref(&self) -> &T {
        &self.value
    }
}

/// Validation error types
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ValidationError {
    OutOfBounds { min: usize, max: usize },
    InvalidFormat { expected: String },
    InvalidCharSet { expected: String },
    InvalidEncoding { expected: String },
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::OutOfBounds { min, max } => {
                write!(f, "Value must be between {} and {}", min, max)
            }
            ValidationError::InvalidFormat { expected } => {
                write!(f, "Invalid format, expected: {}", expected)
            }
            ValidationError::InvalidCharSet { expected } => {
                write!(f, "Invalid character set, expected: {}", expected)
            }
            ValidationError::InvalidEncoding { expected } => {
                write!(f, "Invalid encoding, expected: {}", expected)
            }
        }
    }
}

impl std::error::Error for ValidationError {}

/// Traits for validation implementation

pub trait BoundedValidation {
    fn validate_bounds(&self, min: usize, max: usize) -> bool;
}

pub trait FormatValidation<F> {
    fn validate_format(&self) -> bool;
}

pub trait CharSetValidation<C> {
    fn validate_charset(&self) -> bool;
}

pub trait EncodingValidation<E> {
    fn validate_encoding(&self) -> bool;
}

// Implementations for String

impl BoundedValidation for String {
    fn validate_bounds(&self, min: usize, max: usize) -> bool {
        let len = self.len();
        len >= min && len <= max
    }
}

impl BoundedValidation for &str {
    fn validate_bounds(&self, min: usize, max: usize) -> bool {
        let len = self.len();
        len >= min && len <= max
    }
}

// Implementations for numeric types

macro_rules! impl_bounded_for_int {
    ($($t:ty)*) => ($(
        impl BoundedValidation for $t {
            fn validate_bounds(&self, min: usize, max: usize) -> bool {
                let val = *self as i64;
                val >= min as i64 && val <= max as i64
            }
        }
    )*)
}

impl_bounded_for_int! { i8 i16 i32 i64 isize u8 u16 u32 u64 usize }

macro_rules! impl_bounded_for_float {
    ($($t:ty)*) => ($(
        impl BoundedValidation for $t {
            fn validate_bounds(&self, min: usize, max: usize) -> bool {
                let val = *self as f64;
                val >= min as f64 && val <= max as f64
            }
        }
    )*)
}

impl_bounded_for_float! { f32 f64 }

// Implement BoundedValidation for CharSet (to enable nested validation)
impl<T, C> BoundedValidation for CharSet<T, C> 
where 
    T: BoundedValidation,
{
    fn validate_bounds(&self, min: usize, max: usize) -> bool {
        self.value.validate_bounds(min, max)
    }
}

// Format type markers and implementations

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Email;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Url;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DateTimeFormat;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Json;

impl FormatValidation<Email> for String {
    fn validate_format(&self) -> bool {
        // Basic email validation for boundary safety
        let at_count = self.matches('@').count();
        at_count == 1 && self.len() > 3 && !self.starts_with('@') && !self.ends_with('@')
    }
}

impl FormatValidation<Email> for &str {
    fn validate_format(&self) -> bool {
        let at_count = self.matches('@').count();
        at_count == 1 && self.len() > 3 && !self.starts_with('@') && !self.ends_with('@')
    }
}

impl FormatValidation<Url> for String {
    fn validate_format(&self) -> bool {
        // Basic URL validation for boundary safety
        self.starts_with("http://") || self.starts_with("https://") || self.starts_with("ftp://")
    }
}

impl FormatValidation<Url> for &str {
    fn validate_format(&self) -> bool {
        self.starts_with("http://") || self.starts_with("https://") || self.starts_with("ftp://")
    }
}

impl FormatValidation<Uuid> for String {
    fn validate_format(&self) -> bool {
        // Basic UUID validation (8-4-4-4-12 format)
        let parts: Vec<&str> = self.split('-').collect();
        parts.len() == 5
            && parts[0].len() == 8
            && parts[1].len() == 4
            && parts[2].len() == 4
            && parts[3].len() == 4
            && parts[4].len() == 12
            && parts.iter().all(|part| part.chars().all(|c| c.is_ascii_hexdigit()))
    }
}

impl FormatValidation<Uuid> for &str {
    fn validate_format(&self) -> bool {
        let parts: Vec<&str> = self.split('-').collect();
        parts.len() == 5
            && parts[0].len() == 8
            && parts[1].len() == 4
            && parts[2].len() == 4
            && parts[3].len() == 4
            && parts[4].len() == 12
            && parts.iter().all(|part| part.chars().all(|c| c.is_ascii_hexdigit()))
    }
}

impl FormatValidation<DateTimeFormat> for String {
    fn validate_format(&self) -> bool {
        // Basic ISO 8601 validation (contains T and ends with Z or has timezone)
        if !self.contains('T') {
            return false;
        }
        
        // Must have timezone: either Z suffix or +/- offset after the time part
        if self.ends_with('Z') {
            return true;
        }
        
        // Check for timezone offset (+HH:MM or -HH:MM) after the T and time
        if let Some(t_pos) = self.find('T') {
            let time_part = &self[t_pos + 1..];
            // Look for + or - in the time part (indicating timezone offset)
            time_part.contains('+') || (time_part.contains('-') && time_part.len() > 8)
        } else {
            false
        }
    }
}

impl FormatValidation<DateTimeFormat> for &str {
    fn validate_format(&self) -> bool {
        // Same logic as String implementation
        if !self.contains('T') {
            return false;
        }
        
        if self.ends_with('Z') {
            return true;
        }
        
        if let Some(t_pos) = self.find('T') {
            let time_part = &self[t_pos + 1..];
            time_part.contains('+') || (time_part.contains('-') && time_part.len() > 8)
        } else {
            false
        }
    }
}

impl FormatValidation<Json> for String {
    fn validate_format(&self) -> bool {
        // Basic JSON validation - just check if it parses
        serde_json::from_str::<serde_json::Value>(self).is_ok()
    }
}

impl FormatValidation<Json> for &str {
    fn validate_format(&self) -> bool {
        serde_json::from_str::<serde_json::Value>(self).is_ok()
    }
}

// Character set type markers and implementations

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Ascii;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Alphanumeric;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Printable;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Utf8Safe;

impl CharSetValidation<Ascii> for String {
    fn validate_charset(&self) -> bool {
        self.is_ascii()
    }
}

impl CharSetValidation<Ascii> for &str {
    fn validate_charset(&self) -> bool {
        self.is_ascii()
    }
}

impl CharSetValidation<Alphanumeric> for String {
    fn validate_charset(&self) -> bool {
        self.chars().all(|c| c.is_alphanumeric())
    }
}

impl CharSetValidation<Alphanumeric> for &str {
    fn validate_charset(&self) -> bool {
        self.chars().all(|c| c.is_alphanumeric())
    }
}

impl CharSetValidation<Printable> for String {
    fn validate_charset(&self) -> bool {
        self.chars().all(|c| !c.is_control())
    }
}

impl CharSetValidation<Printable> for &str {
    fn validate_charset(&self) -> bool {
        self.chars().all(|c| !c.is_control())
    }
}

impl CharSetValidation<Utf8Safe> for String {
    fn validate_charset(&self) -> bool {
        // UTF-8 safe means valid UTF-8 without problematic characters
        self.chars().all(|c| !c.is_control() || c == '\n' || c == '\t' || c == '\r')
    }
}

impl CharSetValidation<Utf8Safe> for &str {
    fn validate_charset(&self) -> bool {
        self.chars().all(|c| !c.is_control() || c == '\n' || c == '\t' || c == '\r')
    }
}

// Encoding type markers and implementations

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Base64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Hex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Percent;

impl EncodingValidation<Base64> for String {
    fn validate_encoding(&self) -> bool {
        // Basic base64 validation - valid characters and proper padding
        if self.is_empty() {
            return true; // Empty string is valid base64
        }
        
        // Check for valid characters
        let valid_chars = self.chars().all(|c| {
            c.is_alphanumeric() || c == '+' || c == '/' || c == '='
        });
        
        if !valid_chars {
            return false;
        }
        
        // Split into padding and content
        let trimmed = self.trim_end_matches('=');
        let padding_len = self.len() - trimmed.len();
        
        // Padding can only be 0, 1, or 2 characters
        if padding_len > 2 {
            return false;
        }
        
        // No padding characters allowed in content
        if trimmed.contains('=') {
            return false;
        }
        
        // Length validation - must be multiple of 4 when including padding
        if self.len() % 4 != 0 {
            return false;
        }
        
        // Padding rules
        match padding_len {
            0 => true, // No padding required
            1 => trimmed.len() % 4 == 3, // Single = for 3 content chars
            2 => trimmed.len() % 4 == 2, // Double == for 2 content chars
            _ => false,
        }
    }
}

impl EncodingValidation<Base64> for &str {
    fn validate_encoding(&self) -> bool {
        // Same logic as String implementation
        if self.is_empty() {
            return true;
        }
        
        let valid_chars = self.chars().all(|c| {
            c.is_alphanumeric() || c == '+' || c == '/' || c == '='
        });
        
        if !valid_chars {
            return false;
        }
        
        let trimmed = self.trim_end_matches('=');
        let padding_len = self.len() - trimmed.len();
        
        if padding_len > 2 {
            return false;
        }
        
        if trimmed.contains('=') {
            return false;
        }
        
        if self.len() % 4 != 0 {
            return false;
        }
        
        match padding_len {
            0 => true,
            1 => trimmed.len() % 4 == 3,
            2 => trimmed.len() % 4 == 2,
            _ => false,
        }
    }
}

impl EncodingValidation<Hex> for String {
    fn validate_encoding(&self) -> bool {
        self.chars().all(|c| c.is_ascii_hexdigit())
    }
}

impl EncodingValidation<Hex> for &str {
    fn validate_encoding(&self) -> bool {
        self.chars().all(|c| c.is_ascii_hexdigit())
    }
}

impl EncodingValidation<Percent> for String {
    fn validate_encoding(&self) -> bool {
        // Basic percent encoding validation
        let mut chars = self.chars();
        while let Some(c) = chars.next() {
            if c == '%' {
                // Must be followed by exactly 2 hex digits
                if let (Some(c1), Some(c2)) = (chars.next(), chars.next()) {
                    if !c1.is_ascii_hexdigit() || !c2.is_ascii_hexdigit() {
                        return false;
                    }
                } else {
                    return false;
                }
            } else if !c.is_ascii_alphanumeric() && !"-_.~".contains(c) {
                // Only unreserved characters allowed outside percent encoding
                return false;
            }
        }
        true
    }
}

impl EncodingValidation<Percent> for &str {
    fn validate_encoding(&self) -> bool {
        let mut chars = self.chars();
        while let Some(c) = chars.next() {
            if c == '%' {
                if let (Some(c1), Some(c2)) = (chars.next(), chars.next()) {
                    if !c1.is_ascii_hexdigit() || !c2.is_ascii_hexdigit() {
                        return false;
                    }
                } else {
                    return false;
                }
            } else if !c.is_ascii_alphanumeric() && !"-_.~".contains(c) {
                return false;
            }
        }
        true
    }
}