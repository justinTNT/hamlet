// API endpoint models go here
// Example:

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct HelloReq {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct HelloRes {
    pub message: String,
}