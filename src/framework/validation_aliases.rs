/// Convenient type aliases for common boundary validation patterns
/// These provide clean, readable type signatures for JSON boundary safety

use crate::framework::validation_types::*;

// Common boundary validation types with convenient aliases

/// Safe text with length bounds and UTF-8 safety
pub type SafeText<const MIN: usize, const MAX: usize> = Bounded<CharSet<String, Utf8Safe>, MIN, MAX>;

/// Email address with format validation
pub type EmailAddress = Format<String, Email>;

/// Valid URL with format validation
pub type ValidUrl = Format<String, Url>;

/// UUID string with format validation
pub type UuidString = Format<String, Uuid>;

/// ISO 8601 datetime string with format validation
pub type DateTimeString = Format<String, DateTimeFormat>;

/// JSON string with format validation
pub type JsonString = Format<String, Json>;

/// Base64 encoded string with encoding validation
pub type Base64String = Encoding<String, Base64>;

/// Hexadecimal encoded string with encoding validation
pub type HexString = Encoding<String, Hex>;

/// Percent encoded string with encoding validation
pub type PercentString = Encoding<String, Percent>;

/// ASCII-only text with length bounds
pub type AsciiText<const MIN: usize, const MAX: usize> = Bounded<CharSet<String, Ascii>, MIN, MAX>;

/// Alphanumeric-only text with length bounds
pub type AlphanumericText<const MIN: usize, const MAX: usize> = Bounded<CharSet<String, Alphanumeric>, MIN, MAX>;

/// Printable characters only with length bounds
pub type PrintableText<const MIN: usize, const MAX: usize> = Bounded<CharSet<String, Printable>, MIN, MAX>;

/// Bounded integer with min/max constraints
pub type BoundedInt<const MIN: usize, const MAX: usize> = Bounded<i32, MIN, MAX>;

/// Bounded unsigned integer with min/max constraints
pub type BoundedUint<const MIN: usize, const MAX: usize> = Bounded<u32, MIN, MAX>;

/// Bounded float with min/max constraints
pub type BoundedFloat<const MIN: usize, const MAX: usize> = Bounded<f32, MIN, MAX>;

// Helper functions for creating validated types

/// Helper functions for creating validated types with better error messages
/// These are standalone functions to avoid conflicts with the generic implementations

/// Create a new SafeText with validation
pub fn safe_text<const MIN: usize, const MAX: usize>(value: String) -> Result<SafeText<MIN, MAX>, ValidationError> {
    // First validate charset
    let charset_validated = CharSet::<String, Utf8Safe>::new(value)?;
    // Then validate bounds
    Bounded::new(charset_validated)
}

/// Create a new EmailAddress with validation
pub fn email_address(value: String) -> Result<EmailAddress, ValidationError> {
    Format::new(value)
}

/// Create a new ValidUrl with validation
pub fn valid_url(value: String) -> Result<ValidUrl, ValidationError> {
    Format::new(value)
}

/// Create a new UuidString with validation
pub fn uuid_string(value: String) -> Result<UuidString, ValidationError> {
    Format::new(value)
}

/// Create a new DateTimeString with validation
pub fn datetime_string(value: String) -> Result<DateTimeString, ValidationError> {
    Format::new(value)
}

/// Create a new JsonString with validation
pub fn json_string(value: String) -> Result<JsonString, ValidationError> {
    Format::new(value)
}

/// Create a new Base64String with validation
pub fn base64_string(value: String) -> Result<Base64String, ValidationError> {
    Encoding::new(value)
}

/// Create a new HexString with validation
pub fn hex_string(value: String) -> Result<HexString, ValidationError> {
    Encoding::new(value)
}

/// Create a new PercentString with validation
pub fn percent_string(value: String) -> Result<PercentString, ValidationError> {
    Encoding::new(value)
}

/// Create a new BoundedInt with validation
pub fn bounded_int<const MIN: usize, const MAX: usize>(value: i32) -> Result<BoundedInt<MIN, MAX>, ValidationError> {
    Bounded::new(value)
}

/// Create a new BoundedUint with validation
pub fn bounded_uint<const MIN: usize, const MAX: usize>(value: u32) -> Result<BoundedUint<MIN, MAX>, ValidationError> {
    Bounded::new(value)
}

/// Create a new BoundedFloat with validation
pub fn bounded_float<const MIN: usize, const MAX: usize>(value: f32) -> Result<BoundedFloat<MIN, MAX>, ValidationError> {
    Bounded::new(value)
}

// Convenience functions for common patterns

/// Create a short text field (1-100 characters, UTF-8 safe)
pub type ShortText = SafeText<1, 100>;

/// Create a medium text field (1-1000 characters, UTF-8 safe)
pub type MediumText = SafeText<1, 1000>;

/// Create a long text field (1-10000 characters, UTF-8 safe)
pub type LongText = SafeText<1, 10000>;

/// Create a percentage value (0-100)
pub type Percentage = BoundedUint<0, 100>;

/// Create a port number (1-65535)
pub type PortNumber = BoundedUint<1, 65535>;

/// Create an age value (0-150)
pub type Age = BoundedUint<0, 150>;

/// Create a year value (1900-2100)
pub type Year = BoundedUint<1900, 2100>;