// Integration tests for composable validation and real-world scenarios
use proto_rust::{
    // Core validation types
    Bounded, Format, CharSet, Encoding, ValidationError,
    // Format markers
    Email, Url, Utf8Safe, Base64,
    // Type aliases
    EmailAddress, ValidUrl, SafeText, Base64String,
    // Helper functions
    email_address, valid_url, safe_text, base64_string,
};
use serde::{Deserialize, Serialize};

#[cfg(test)]
mod composable_validation_tests {
    use super::*;

    #[test]
    fn test_nested_validation_composition() {
        // Test that SafeText properly composes CharSet and Bounded validation
        type TestText = Bounded<CharSet<String, Utf8Safe>, 5, 20>;
        
        // Valid: UTF-8 safe and within bounds
        let valid_text = "Hello 世界!".to_string();
        let composed = CharSet::<String, Utf8Safe>::new(valid_text.clone()).expect("Valid charset");
        let bounded = Bounded::<CharSet<String, Utf8Safe>, 5, 20>::new(composed).expect("Valid bounds");
        
        assert_eq!(bounded.as_ref().as_ref(), &valid_text);

        // Invalid: too short (fails Bounded validation)
        let short_text = "Hi".to_string();
        let short_charset = CharSet::<String, Utf8Safe>::new(short_text).expect("Valid charset but wrong bounds");
        let short_result = Bounded::<CharSet<String, Utf8Safe>, 5, 20>::new(short_charset);
        assert!(short_result.is_err());

        // Invalid: control characters (fails CharSet validation)
        let control_text = "Hello\x00World".to_string();
        let control_result = CharSet::<String, Utf8Safe>::new(control_text);
        assert!(control_result.is_err());
    }

    #[test]
    fn test_safe_text_helper_integration() {
        // Test that the safe_text helper properly chains validation
        let valid: SafeText<5, 15> = safe_text("Hello World".to_string()).expect("Valid safe text");
        
        // Verify both validations are applied
        assert_eq!(valid.as_ref().value, "Hello World");
        assert!(valid.as_ref().value.len() >= 5);
        assert!(valid.as_ref().value.len() <= 15);

        // Test failure cases
        let too_short: Result<SafeText<10, 20>, _> = safe_text("Short".to_string());
        assert!(too_short.is_err());

        let has_control: Result<SafeText<1, 20>, _> = safe_text("Has\x00Control".to_string());
        assert!(has_control.is_err());
    }

    #[test]
    fn test_multiple_format_validations() {
        // Test that different format validations work independently
        let email = email_address("test@example.com".to_string()).expect("Valid email");
        let url = valid_url("https://example.com".to_string()).expect("Valid URL");
        let base64 = base64_string("SGVsbG8gV29ybGQ=".to_string()).expect("Valid base64");

        assert_eq!(email.as_ref(), "test@example.com");
        assert_eq!(url.as_ref(), "https://example.com");
        assert_eq!(base64.as_ref(), "SGVsbG8gV29ybGQ=");

        // Test that they don't interfere with each other
        let invalid_email = email_address("https://example.com".to_string());
        assert!(invalid_email.is_err()); // URL is not a valid email

        let invalid_url = valid_url("test@example.com".to_string());
        assert!(invalid_url.is_err()); // Email is not a valid URL
    }
}

#[cfg(test)]
mod real_world_scenario_tests {
    use super::*;

    // Example API model using validation types
    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct UserRegistrationRequest {
        email: EmailAddress,
        username: SafeText<3, 50>,
        bio: Option<SafeText<1, 500>>,
        website: Option<ValidUrl>,
        avatar_data: Option<Base64String>,
    }

    #[test]
    fn test_user_registration_valid() {
        let email = email_address("user@example.com".to_string()).expect("Valid email");
        let username = safe_text("john_doe".to_string()).expect("Valid username");
        let bio = Some(safe_text("Software developer interested in Rust and Elm".to_string()).expect("Valid bio"));
        let website = Some(valid_url("https://johndoe.dev".to_string()).expect("Valid website"));
        let avatar_data = Some(base64_string("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==".to_string()).expect("Valid avatar"));

        let request = UserRegistrationRequest {
            email,
            username,
            bio,
            website,
            avatar_data,
        };

        // Test serialization/deserialization
        let serialized = serde_json::to_string(&request).expect("Should serialize");
        let deserialized: UserRegistrationRequest = serde_json::from_str(&serialized).expect("Should deserialize");

        assert_eq!(deserialized.email.as_ref(), "user@example.com");
        assert_eq!(deserialized.username.as_ref().value, "john_doe");
    }

    #[test]
    fn test_user_registration_validation_failures() {
        // Test various validation failures

        // Invalid email
        let invalid_email = email_address("not-an-email".to_string());
        assert!(invalid_email.is_err());

        // Username too short
        let short_username: Result<SafeText<3, 50>, _> = safe_text("ab".to_string());
        assert!(short_username.is_err());

        // Username too long
        let long_username: Result<SafeText<3, 50>, _> = safe_text("a".repeat(51));
        assert!(long_username.is_err());

        // Invalid website URL
        let invalid_website = valid_url("not-a-url".to_string());
        assert!(invalid_website.is_err());

        // Invalid base64
        let invalid_avatar = base64_string("not-base64!".to_string());
        assert!(invalid_avatar.is_err());

        // Bio too long
        let long_bio: Result<SafeText<1, 500>, _> = safe_text("a".repeat(501));
        assert!(long_bio.is_err());
    }

    // Example webhook model
    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct PaymentWebhook {
        payment_id: SafeText<1, 100>,
        customer_email: EmailAddress,
        amount_cents: proto_rust::BoundedUint<1, 1000000000>, // Up to $10M
        currency: SafeText<3, 3>, // ISO currency codes
        signature: Base64String,
    }

    #[test]
    fn test_payment_webhook_validation() {
        // Valid payment webhook
        let payment_id = safe_text("pay_1234567890".to_string()).expect("Valid payment ID");
        let customer_email = email_address("customer@example.com".to_string()).expect("Valid email");
        let amount = proto_rust::bounded_uint(199900).expect("Valid amount"); // $1999.00
        let currency = safe_text("USD".to_string()).expect("Valid currency");
        let signature = base64_string("dGhpcyBpcyBhIHNpZ25hdHVyZQ==".to_string()).expect("Valid signature");

        let webhook = PaymentWebhook {
            payment_id,
            customer_email,
            amount_cents: amount,
            currency,
            signature,
        };

        // Test serialization
        let serialized = serde_json::to_string(&webhook).expect("Should serialize");
        assert!(serialized.contains("pay_1234567890"));
        assert!(serialized.contains("customer@example.com"));

        // Test deserialization  
        let deserialized: PaymentWebhook = serde_json::from_str(&serialized).expect("Should deserialize");
        assert_eq!(deserialized.payment_id.as_ref().value, "pay_1234567890");
        assert_eq!(*deserialized.amount_cents.as_ref(), 199900);
    }

    #[test]
    fn test_payment_webhook_boundary_validation() {
        // Test boundary-specific validations

        // Currency must be exactly 3 characters (ISO standard)
        let short_currency: Result<SafeText<3, 3>, _> = safe_text("US".to_string());
        assert!(short_currency.is_err());

        let long_currency: Result<SafeText<3, 3>, _> = safe_text("USDT".to_string());
        assert!(long_currency.is_err());

        let exact_currency: SafeText<3, 3> = safe_text("EUR".to_string()).expect("Exactly 3 chars should work");
        assert_eq!(exact_currency.as_ref().value, "EUR");

        // Amount bounds (prevent obviously invalid amounts)
        let zero_amount: Result<proto_rust::BoundedUint<1, 1000000000>, _> = proto_rust::bounded_uint(0);
        assert!(zero_amount.is_err());

        let huge_amount: Result<proto_rust::BoundedUint<1, 1000000000>, _> = proto_rust::bounded_uint(1000000001);
        assert!(huge_amount.is_err());

        // Payment ID length bounds (prevent huge IDs)
        let empty_id: Result<SafeText<1, 100>, _> = safe_text("".to_string());
        assert!(empty_id.is_err());

        let huge_id: Result<SafeText<1, 100>, _> = safe_text("x".repeat(101));
        assert!(huge_id.is_err());
    }
}

#[cfg(test)]
mod boundary_safety_tests {
    use super::*;

    #[test]
    fn test_json_payload_size_protection() {
        // Test that validation prevents huge JSON payloads

        // Small payload should work
        let small: SafeText<1, 100> = safe_text("Small message".to_string()).expect("Small payload");
        let serialized_small = serde_json::to_string(&small).expect("Should serialize");
        assert!(serialized_small.len() < 200); // Reasonable size

        // Attempt to create huge payload should fail at validation
        let huge_attempt: Result<SafeText<1, 100>, _> = safe_text("x".repeat(101));
        assert!(huge_attempt.is_err());

        // This protects against JSON bombs at the type level
    }

    #[test]
    fn test_format_safety_protection() {
        // Test that format validation prevents malformed data

        // Valid formats should serialize/deserialize cleanly
        let email = email_address("test@example.com".to_string()).expect("Valid email");
        let url = valid_url("https://example.com".to_string()).expect("Valid URL");

        let email_json = serde_json::to_string(&email).expect("Email should serialize");
        let url_json = serde_json::to_string(&url).expect("URL should serialize");

        assert!(email_json.contains("test@example.com"));
        assert!(url_json.contains("https://example.com"));

        // Invalid formats can't be created, so they can't pollute JSON
        let invalid_email = email_address("malformed".to_string());
        let invalid_url = valid_url("javascript:alert('xss')".to_string());

        assert!(invalid_email.is_err());
        assert!(invalid_url.is_err());
    }

    #[test]
    fn test_character_safety_protection() {
        // Test that character set validation prevents unsafe characters

        // Safe characters should work
        let safe: SafeText<1, 50> = safe_text("Hello, safe world! 123".to_string()).expect("Safe characters");
        let serialized = serde_json::to_string(&safe).expect("Should serialize safely");
        assert!(serialized.contains("Hello, safe world! 123"));

        // Unsafe control characters should be rejected
        let unsafe_null: Result<SafeText<1, 50>, _> = safe_text("Has\x00null".to_string());
        let unsafe_bell: Result<SafeText<1, 50>, _> = safe_text("Has\x07bell".to_string());

        assert!(unsafe_null.is_err());
        assert!(unsafe_bell.is_err());

        // This prevents control characters from appearing in JSON
    }

    #[test]
    fn test_encoding_safety_protection() {
        // Test that encoding validation ensures proper encoding

        // Valid base64 should work
        let valid_b64 = base64_string("SGVsbG8gV29ybGQ=".to_string()).expect("Valid base64");
        let serialized = serde_json::to_string(&valid_b64).expect("Should serialize");
        assert!(serialized.contains("SGVsbG8gV29ybGQ="));

        // Invalid base64 should be rejected
        let invalid_b64 = base64_string("Invalid Base64!".to_string());
        assert!(invalid_b64.is_err());

        // This ensures only properly encoded data appears in JSON
    }

    #[test]
    fn test_boundary_validation_vs_business_logic() {
        // Demonstrate that boundary validation is separate from business logic

        // These are valid at the boundary level (format/size)
        let email = email_address("test@competitor.com".to_string()).expect("Format is valid");
        let age = proto_rust::bounded_uint::<13, 120>(16).expect("Range is valid");
        let username: SafeText<1, 20> = safe_text("admin".to_string()).expect("Format and size are valid");

        // But business logic might reject them:
        // - "test@competitor.com" might not be allowed domain (business rule)
        // - 16 might be too young for certain features (business rule)  
        // - "admin" might be a reserved username (business rule)

        // The validation types only ensure:
        assert_eq!(email.as_ref(), "test@competitor.com"); // Valid email format
        assert_eq!(*age.as_ref(), 16); // Valid age range
        assert_eq!(username.as_ref().value, "admin"); // Valid username format

        // Business logic validation would happen in handlers, not here
        // This separation is key to the design
    }
}

#[cfg(test)]
mod performance_tests {
    use super::*;

    #[test]
    fn test_validation_performance() {
        // Test that validation doesn't have significant overhead
        use std::time::Instant;

        let start = Instant::now();
        
        // Create many validated types
        for i in 0..1000 {
            let email = email_address(format!("user{}@example.com", i)).expect("Valid email");
            let text: SafeText<1, 50> = safe_text(format!("Message number {}", i)).expect("Valid text");
            let url = valid_url(format!("https://example{}.com", i)).expect("Valid URL");
            
            // Use them to prevent optimization
            assert!(email.as_ref().contains(&i.to_string()));
            assert!(text.as_ref().value.contains(&i.to_string()));
            assert!(url.as_ref().contains(&i.to_string()));
        }

        let elapsed = start.elapsed();
        
        // Validation should be fast (adjust threshold as needed)
        assert!(elapsed.as_millis() < 100, "Validation took too long: {:?}", elapsed);
    }

    #[test]
    fn test_zero_allocation_validation() {
        // Test that validation doesn't require unnecessary allocations for valid cases
        let test_string = "test@example.com".to_string();
        
        // The validation should work without additional allocations
        let email = email_address(test_string.clone()).expect("Valid email");
        
        // The original string should be moved into the validated type
        assert_eq!(email.as_ref(), &test_string);
        
        // After moving into email, test_string should be consumed
        // (This test mainly documents the intended behavior)
    }
}