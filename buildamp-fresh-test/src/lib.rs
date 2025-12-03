use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct TestMessage {
    pub content: String,
}

#[wasm_bindgen]
pub fn hello_buildamp(msg: String) -> String {
    let test_msg: TestMessage = serde_json::from_str(&msg)
        .unwrap_or(TestMessage { content: "Hello BuildAmp!".to_string() });
    
    format!("BuildAmp says: {}", test_msg.content)
}

#[wasm_bindgen]
pub fn test_minimal_api() -> String {
    "Fresh project test successful!".to_string()
}