#![cfg(feature = "wasm-tests")]

use proto_rust::{SubmitItemReq, BuildAmpEndpoint, Context, elm_export};

#[test]
fn test_submit_item_validation() {
    let mut context = Context::default();
    context.is_extension = true; // Required for SubmitItem

    // 1. Valid Request
    let mut valid_req = SubmitItemReq {
        host: "example.com".to_string(),
        title: "Valid Title".to_string(),
        link: "http://example.com".to_string(),
        image: "".to_string(),
        extract: "".to_string(),
        owner_comment: "".to_string(),
        tags: vec![],
    };
    assert!(valid_req.validate(&context).is_ok());

    // 2. Invalid Request (Empty Title)
    let mut invalid_req = SubmitItemReq {
        host: "example.com".to_string(),
        title: "".to_string(), // Should fail #[api(Required)]
        link: "http://example.com".to_string(),
        image: "".to_string(),
        extract: "".to_string(),
        owner_comment: "".to_string(),
        tags: vec![],
    };
    
    let result = invalid_req.validate(&context);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "title is required");
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestMinLength")]
pub struct TestMinLengthReq {
    #[api(MinLength(3))]
    pub code: String,
}

#[test]
fn test_min_length() {
    let context = Context::default();
    
    // Valid
    let mut valid = TestMinLengthReq { code: "abc".to_string() };
    assert!(valid.validate(&context).is_ok());

    // Invalid
    let mut invalid = TestMinLengthReq { code: "ab".to_string() };
    let res = invalid.validate(&context);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), "code must be at least 3 characters");
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestEmail")]
pub struct TestEmailReq {
    #[api(Email)]
    pub email: String,
}

#[test]
fn test_email() {
    let context = Context::default();
    
    // Valid
    let mut valid = TestEmailReq { email: "test@example.com".to_string() };
    assert!(valid.validate(&context).is_ok());

    // Invalid
    let mut invalid = TestEmailReq { email: "not-an-email".to_string() };
    let res = invalid.validate(&context);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), "email is invalid");
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestAuth", Auth)]
pub struct TestAuthReq {
    pub data: String,
}

#[test]
fn test_auth() {
    // 1. Unauthenticated Context
    let mut context = Context::default();
    context.user_id = None;

    let mut req = TestAuthReq { data: "secret".to_string() };
    let res = req.validate(&context);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), "Unauthorized");

    // 2. Authenticated Context
    context.user_id = Some("user_123".to_string());
    assert!(req.validate(&context).is_ok());
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestTrim")]
pub struct TestTrimReq {
    #[api(Trim)]
    pub name: String,
}

#[test]
fn test_trim() {
    let context = Context::default();
    let mut req = TestTrimReq { name: "  hello  ".to_string() };
    
    assert!(req.validate(&context).is_ok());
    assert_eq!(req.name, "hello");
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestInject")]
pub struct TestInjectReq {
    #[api(Inject = "user_id")]
    pub user: Option<String>,
}

#[test]
fn test_inject() {
    let mut context = Context::default();
    context.user_id = Some("user_456".to_string());

    let mut req = TestInjectReq { user: None };
    
    assert!(req.validate(&context).is_ok());
    assert_eq!(req.user, Some("user_456".to_string()));
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestReadOnly")]
pub struct TestReadOnlyReq {
    #[api(ReadOnly)]
    pub system_flag: bool,
}

#[test]
fn test_read_only() {
    let context = Context::default();
    let mut req = TestReadOnlyReq { system_flag: true }; // Client tries to set it
    
    assert!(req.validate(&context).is_ok());
    assert_eq!(req.system_flag, false); // Should be reset to default
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestUrl")]
pub struct TestUrlReq {
    #[api(Url)]
    pub link: String,
}

#[test]
fn test_url() {
    let context = Context::default();
    
    // Valid
    let mut valid = TestUrlReq { link: "https://example.com".to_string() };
    assert!(valid.validate(&context).is_ok());

    let mut valid_http = TestUrlReq { link: "http://example.com".to_string() };
    assert!(valid_http.validate(&context).is_ok());

    // Invalid
    let mut invalid = TestUrlReq { link: "javascript:alert(1)".to_string() };
    let res = invalid.validate(&context);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), "link must be a valid URL");

    let mut invalid_txt = TestUrlReq { link: "not-a-url".to_string() };
    assert!(invalid_txt.validate(&context).is_err());

    // Empty URL should be valid (optional)
    let mut empty_url = TestUrlReq { link: "".to_string() };
    assert!(empty_url.validate(&context).is_ok());
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestMaxLen")]
pub struct TestMaxLenReq {
    #[api(MaxLength(5))]
    pub text: String,
    #[api(MaxLength(2))]
    pub list: Vec<String>,
}

#[test]
fn test_max_length() {
    let context = Context::default();
    
    // Valid
    let mut valid = TestMaxLenReq { 
        text: "12345".to_string(),
        list: vec!["a".to_string(), "b".to_string()]
    };
    assert!(valid.validate(&context).is_ok());

    // Invalid String
    let mut invalid_text = TestMaxLenReq { 
        text: "123456".to_string(),
        list: vec![]
    };
    let res = invalid_text.validate(&context);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), "text must be at most 5 characters/items");

    // Invalid List
    let mut invalid_list = TestMaxLenReq { 
        text: "".to_string(),
        list: vec!["a".to_string(), "b".to_string(), "c".to_string()]
    };
    let res2 = invalid_list.validate(&context);
    assert!(res2.is_err());
    assert_eq!(res2.unwrap_err(), "list must be at most 2 characters/items");
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestExtensionOnly", ExtensionOnly)]
pub struct TestExtensionOnlyReq {
    pub data: String,
}

#[test]
fn test_extension_only() {
    let mut context = Context::default();
    
    // 1. Not Extension (Default)
    context.is_extension = false;
    let mut req = TestExtensionOnlyReq { data: "test".to_string() };
    let res = req.validate(&context);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), "This action is only allowed from the extension");

    // 2. Is Extension
    context.is_extension = true;
    assert!(req.validate(&context).is_ok());
}

#[derive(serde::Serialize, serde::Deserialize, BuildAmpEndpoint)]
#[api(path = "TestDefault")]
pub struct TestDefaultReq {
    #[serde(default)]
    #[api(Default = "default_val")]
    pub field1: String,
    
    #[api(Default = "opt_default")]
    pub field2: Option<String>,
}

#[test]
fn test_default() {
    let context = Context::default();
    
    // 1. Empty/None inputs
    let mut req = TestDefaultReq { 
        field1: "".to_string(), 
        field2: None 
    };
    assert!(req.validate(&context).is_ok());
    assert_eq!(req.field1, "default_val");
    assert_eq!(req.field2, Some("opt_default".to_string()));

    // 2. Provided inputs (should not be overwritten)
    let mut req2 = TestDefaultReq { 
        field1: "user_val".to_string(), 
        field2: Some("user_opt".to_string()) 
    };
    assert!(req2.validate(&context).is_ok());
    assert_eq!(req2.field1, "user_val");
    assert_eq!(req2.field2, Some("user_opt".to_string()));
}

#[test]
fn test_endpoint_path() {
    assert_eq!(SubmitItemReq::endpoint_path(), "SubmitItem");
}
