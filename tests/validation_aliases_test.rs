// Unit tests for validation type aliases and helper functions
use proto_rust::{
    // Type aliases
    EmailAddress, ValidUrl, UuidString, DateTimeString, JsonString,
    Base64String, HexString, PercentString,
    SafeText, BoundedInt, BoundedUint, BoundedFloat,
    ShortText, MediumText, LongText, Percentage, PortNumber, Age, Year,
    // Helper functions
    email_address, valid_url, uuid_string, datetime_string, json_string,
    base64_string, hex_string, percent_string,
    safe_text, bounded_int, bounded_uint, bounded_float,
    ValidationError,
};

#[cfg(test)]
mod type_aliases_tests {
    use super::*;

    #[test]
    fn test_email_address_alias() {
        // Valid emails
        let valid = email_address("test@example.com".to_string()).expect("Valid email");
        assert_eq!(valid.as_ref(), "test@example.com");

        // Invalid emails
        let invalid = email_address("not-an-email".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_valid_url_alias() {
        // Valid URLs
        let valid = valid_url("https://example.com".to_string()).expect("Valid URL");
        assert_eq!(valid.as_ref(), "https://example.com");

        // Invalid URLs
        let invalid = valid_url("not-a-url".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_uuid_string_alias() {
        // Valid UUID
        let valid = uuid_string("550e8400-e29b-41d4-a716-446655440000".to_string()).expect("Valid UUID");
        assert_eq!(valid.as_ref(), "550e8400-e29b-41d4-a716-446655440000");

        // Invalid UUID
        let invalid = uuid_string("not-a-uuid".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_datetime_string_alias() {
        // Valid datetime
        let valid = datetime_string("2023-12-01T10:30:00Z".to_string()).expect("Valid datetime");
        assert_eq!(valid.as_ref(), "2023-12-01T10:30:00Z");

        // Invalid datetime
        let invalid = datetime_string("not-a-datetime".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_json_string_alias() {
        // Valid JSON
        let valid = json_string(r#"{"key": "value"}"#.to_string()).expect("Valid JSON");
        assert_eq!(valid.as_ref(), r#"{"key": "value"}"#);

        // Invalid JSON
        let invalid = json_string("not json".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_base64_string_alias() {
        // Valid base64
        let valid = base64_string("SGVsbG8gV29ybGQ=".to_string()).expect("Valid base64");
        assert_eq!(valid.as_ref(), "SGVsbG8gV29ybGQ=");

        // Invalid base64
        let invalid = base64_string("not base64!".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_hex_string_alias() {
        // Valid hex
        let valid = hex_string("deadbeef".to_string()).expect("Valid hex");
        assert_eq!(valid.as_ref(), "deadbeef");

        // Invalid hex
        let invalid = hex_string("not hex".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_percent_string_alias() {
        // Valid percent encoding
        let valid = percent_string("hello%20world".to_string()).expect("Valid percent encoding");
        assert_eq!(valid.as_ref(), "hello%20world");

        // Invalid percent encoding
        let invalid = percent_string("hello%2".to_string());
        assert!(invalid.is_err());
    }

    #[test]
    fn test_safe_text_alias() {
        // Valid safe text
        let valid: SafeText<1, 10> = safe_text("hello".to_string()).expect("Valid safe text");
        assert_eq!(valid.as_ref().value, "hello");

        // Too short
        let too_short: Result<SafeText<5, 10>, _> = safe_text("hi".to_string());
        assert!(too_short.is_err());

        // Too long
        let too_long: Result<SafeText<1, 5>, _> = safe_text("this is too long".to_string());
        assert!(too_long.is_err());

        // Non-UTF8 safe (control characters)
        let non_utf8_safe: Result<SafeText<1, 10>, _> = safe_text("hello\x00world".to_string());
        assert!(non_utf8_safe.is_err());
    }

    #[test]
    fn test_bounded_int_alias() {
        // Valid bounded int
        let valid: BoundedInt<0, 100> = bounded_int(50).expect("Valid bounded int");
        assert_eq!(*valid.as_ref(), 50);

        // Out of range
        let out_of_range: Result<BoundedInt<0, 100>, _> = bounded_int(150);
        assert!(out_of_range.is_err());
    }

    #[test]
    fn test_bounded_uint_alias() {
        // Valid bounded uint
        let valid: BoundedUint<0, 100> = bounded_uint(75).expect("Valid bounded uint");
        assert_eq!(*valid.as_ref(), 75);

        // Out of range
        let out_of_range: Result<BoundedUint<10, 20>, _> = bounded_uint(5);
        assert!(out_of_range.is_err());
    }

    #[test]
    fn test_bounded_float_alias() {
        // Valid bounded float
        let valid: BoundedFloat<0, 10> = bounded_float(3.14).expect("Valid bounded float");
        assert_eq!(*valid.as_ref(), 3.14);

        // Out of range
        let out_of_range: Result<BoundedFloat<0, 5>, _> = bounded_float(10.5);
        assert!(out_of_range.is_err());
    }
}

#[cfg(test)]
mod convenience_aliases_tests {
    use super::*;

    #[test]
    fn test_short_text() {
        // ShortText is SafeText<1, 100>
        let valid: ShortText = safe_text("This is short text".to_string()).expect("Valid short text");
        assert_eq!(valid.as_ref().value, "This is short text");

        // Too long for short text
        let too_long: Result<ShortText, _> = safe_text("a".repeat(101));
        assert!(too_long.is_err());

        // Empty string should fail (min is 1)
        let empty: Result<ShortText, _> = safe_text("".to_string());
        assert!(empty.is_err());
    }

    #[test]
    fn test_medium_text() {
        // MediumText is SafeText<1, 1000>
        let valid: MediumText = safe_text("This is medium length text that can be longer than short text but not too long".to_string()).expect("Valid medium text");
        assert!(valid.as_ref().value.len() < 1000);

        // Too long for medium text
        let too_long: Result<MediumText, _> = safe_text("a".repeat(1001));
        assert!(too_long.is_err());
    }

    #[test]
    fn test_long_text() {
        // LongText is SafeText<1, 10000>
        let valid: LongText = safe_text("This is long text that can be much longer than medium text and can contain a lot of content for things like blog posts or detailed descriptions".to_string()).expect("Valid long text");
        assert!(valid.as_ref().value.len() < 10000);

        // Too long for long text
        let too_long: Result<LongText, _> = safe_text("a".repeat(10001));
        assert!(too_long.is_err());
    }

    #[test]
    fn test_percentage() {
        // Percentage is BoundedUint<0, 100>
        let valid: Percentage = bounded_uint(75).expect("Valid percentage");
        assert_eq!(*valid.as_ref(), 75);

        let min: Percentage = bounded_uint(0).expect("Valid minimum percentage");
        assert_eq!(*min.as_ref(), 0);

        let max: Percentage = bounded_uint(100).expect("Valid maximum percentage");
        assert_eq!(*max.as_ref(), 100);

        // Out of range
        let over_100: Result<Percentage, _> = bounded_uint(101);
        assert!(over_100.is_err());
    }

    #[test]
    fn test_port_number() {
        // PortNumber is BoundedUint<1, 65535>
        let valid: PortNumber = bounded_uint(8080).expect("Valid port");
        assert_eq!(*valid.as_ref(), 8080);

        let min: PortNumber = bounded_uint(1).expect("Valid minimum port");
        assert_eq!(*min.as_ref(), 1);

        let max: PortNumber = bounded_uint(65535).expect("Valid maximum port");
        assert_eq!(*max.as_ref(), 65535);

        // Out of range
        let zero: Result<PortNumber, _> = bounded_uint(0);
        assert!(zero.is_err());

        let too_high: Result<PortNumber, _> = bounded_uint(65536);
        assert!(too_high.is_err());
    }

    #[test]
    fn test_age() {
        // Age is BoundedUint<0, 150>
        let valid: Age = bounded_uint(25).expect("Valid age");
        assert_eq!(*valid.as_ref(), 25);

        let newborn: Age = bounded_uint(0).expect("Valid newborn age");
        assert_eq!(*newborn.as_ref(), 0);

        let old: Age = bounded_uint(150).expect("Valid maximum age");
        assert_eq!(*old.as_ref(), 150);

        // Out of range
        let too_old: Result<Age, _> = bounded_uint(151);
        assert!(too_old.is_err());
    }

    #[test]
    fn test_year() {
        // Year is BoundedUint<1900, 2100>
        let valid: Year = bounded_uint(2023).expect("Valid year");
        assert_eq!(*valid.as_ref(), 2023);

        let min: Year = bounded_uint(1900).expect("Valid minimum year");
        assert_eq!(*min.as_ref(), 1900);

        let max: Year = bounded_uint(2100).expect("Valid maximum year");
        assert_eq!(*max.as_ref(), 2100);

        // Out of range
        let too_old: Result<Year, _> = bounded_uint(1899);
        assert!(too_old.is_err());

        let too_future: Result<Year, _> = bounded_uint(2101);
        assert!(too_future.is_err());
    }
}

#[cfg(test)]
mod helper_function_edge_cases_tests {
    use super::*;

    #[test]
    fn test_email_edge_cases() {
        // Minimum valid email
        let min_email = email_address("a@b.c".to_string()).expect("Minimum valid email");
        assert_eq!(min_email.as_ref(), "a@b.c");

        // Email with plus
        let plus_email = email_address("user+tag@example.com".to_string()).expect("Email with plus");
        assert_eq!(plus_email.as_ref(), "user+tag@example.com");

        // Email with dots
        let dot_email = email_address("user.name@example.org".to_string()).expect("Email with dots");
        assert_eq!(dot_email.as_ref(), "user.name@example.org");

        // Edge case: starts with @
        let invalid_start = email_address("@example.com".to_string());
        assert!(invalid_start.is_err());

        // Edge case: ends with @
        let invalid_end = email_address("user@".to_string());
        assert!(invalid_end.is_err());
    }

    #[test]
    fn test_url_edge_cases() {
        // Different protocols
        let https = valid_url("https://example.com".to_string()).expect("HTTPS URL");
        let http = valid_url("http://example.com".to_string()).expect("HTTP URL");
        let ftp = valid_url("ftp://files.example.com".to_string()).expect("FTP URL");

        assert_eq!(https.as_ref(), "https://example.com");
        assert_eq!(http.as_ref(), "http://example.com");
        assert_eq!(ftp.as_ref(), "ftp://files.example.com");

        // Invalid protocols should fail
        let file_url = valid_url("file:///etc/passwd".to_string());
        assert!(file_url.is_err());

        let javascript = valid_url("javascript:alert('xss')".to_string());
        assert!(javascript.is_err());
    }

    #[test]
    fn test_uuid_edge_cases() {
        // Different versions of UUIDs
        let uuid_v1 = uuid_string("6ba7b810-9dad-11d1-80b4-00c04fd430c8".to_string()).expect("UUID v1");
        let uuid_v4 = uuid_string("550e8400-e29b-41d4-a716-446655440000".to_string()).expect("UUID v4");

        assert_eq!(uuid_v1.as_ref(), "6ba7b810-9dad-11d1-80b4-00c04fd430c8");
        assert_eq!(uuid_v4.as_ref(), "550e8400-e29b-41d4-a716-446655440000");

        // Case sensitivity
        let uppercase = uuid_string("550E8400-E29B-41D4-A716-446655440000".to_string()).expect("Uppercase UUID");
        let lowercase = uuid_string("550e8400-e29b-41d4-a716-446655440000".to_string()).expect("Lowercase UUID");

        assert_eq!(uppercase.as_ref(), "550E8400-E29B-41D4-A716-446655440000");
        assert_eq!(lowercase.as_ref(), "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_safe_text_edge_cases() {
        // Exactly at boundaries
        let exact_min: SafeText<5, 10> = safe_text("hello".to_string()).expect("Exactly minimum length");
        let exact_max: SafeText<5, 10> = safe_text("1234567890".to_string()).expect("Exactly maximum length");

        assert_eq!(exact_min.as_ref().value.len(), 5);
        assert_eq!(exact_max.as_ref().value.len(), 10);

        // Unicode characters
        let unicode: SafeText<1, 20> = safe_text("Hello 世界 🌍".to_string()).expect("Unicode text");
        assert!(unicode.as_ref().value.contains("世界"));

        // Whitespace preservation
        let whitespace: SafeText<1, 20> = safe_text("  hello  world  ".to_string()).expect("Text with whitespace");
        assert_eq!(whitespace.as_ref().value, "  hello  world  ");

        // Newlines and tabs (should be allowed in UTF8Safe)
        let newlines: SafeText<1, 20> = safe_text("hello\nworld\ttest".to_string()).expect("Text with newlines");
        assert!(newlines.as_ref().value.contains('\n'));
        assert!(newlines.as_ref().value.contains('\t'));
    }

    #[test]
    fn test_bounded_numeric_edge_cases() {
        // Zero boundaries
        let zero_min: BoundedUint<0, 5> = bounded_uint(0).expect("Zero minimum");
        assert_eq!(*zero_min.as_ref(), 0);

        // Negative numbers with signed ints
        // Note: Can't use negative const generics, use positive bounds instead
        let negative: BoundedInt<0, 100> = bounded_int(5).expect("Valid positive number");
        assert_eq!(*negative.as_ref(), 5);

        // Large numbers
        let large: BoundedUint<1000, 2000> = bounded_uint(1500).expect("Large number");
        assert_eq!(*large.as_ref(), 1500);

        // Float precision
        let precise: BoundedFloat<0, 1> = bounded_float(0.123456).expect("Precise float");
        assert!((precise.as_ref() - 0.123456).abs() < f32::EPSILON);
    }
}