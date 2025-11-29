use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_json;

mod shared_types;
pub use shared_types::*;

#[wasm_bindgen]
pub fn encode_request(_endpoint: String, json_in: String) -> String {
    // Client-side: Encode Elm request -> Wire JSON
    json_in
}

#[wasm_bindgen]
pub fn decode_request(endpoint: String, wire: String) -> String {
    match endpoint.as_str() {
        "GetFeed" => {
            match serde_json::from_str::<GetFeedReq>(&wire) {
                Ok(_) => wire,
                Err(e) => {
                    let error = ApiResponse::<()>::Error(ApiError::ValidationError {
                        details: format!("Invalid GetFeedReq: {}", e),
                    });
                    serde_json::to_string(&error).unwrap_or_else(|_| "{}".to_string())
                }
            }
        }
        "SubmitItem" => {
            match serde_json::from_str::<SubmitItemReq>(&wire) {
                Ok(req) => {
                    if req.title.is_empty() {
                         let error = ApiResponse::<()>::Error(ApiError::ValidationError {
                            details: "Title cannot be empty".to_string(),
                        });
                        return serde_json::to_string(&error).unwrap_or_else(|_| "{}".to_string());
                    }
                    wire
                }, 
                Err(e) => {
                    let error = ApiResponse::<()>::Error(ApiError::ValidationError {
                        details: format!("Invalid SubmitItemReq: {}", e),
                    });
                    serde_json::to_string(&error).unwrap_or_else(|_| "{}".to_string())
                }
            }
        }
        _ => {
             let error = ApiResponse::<()>::Error(ApiError::NotFound {
                details: format!("Unknown endpoint: {}", endpoint),
            });
            serde_json::to_string(&error).unwrap_or_else(|_| "{}".to_string())
        }
    }
}

#[wasm_bindgen]
pub fn encode_response(_endpoint: String, json_in: String) -> String {
    json_in
}

#[wasm_bindgen]
pub fn decode_response(endpoint: String, wire: String) -> String {
    // Client-side validation could go here
    if endpoint == "GetFeed" {
         if let Ok(_) = serde_json::from_str::<GetFeedRes>(&wire) {
             return wire;
         }
    }
    if endpoint == "SubmitItem" {
         if let Ok(_) = serde_json::from_str::<SubmitItemRes>(&wire) {
             return wire;
         }
    }
    
    // Pass through or generic error check
    wire
}