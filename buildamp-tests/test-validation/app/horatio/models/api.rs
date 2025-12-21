use buildamp_macro::buildamp;
use serde::{Deserialize, Serialize};
use elm_rs::{Elm, ElmEncode, ElmDecode};

#[derive(Debug, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct StandardServerContext {
    pub dummy: String,
}

#[buildamp(path = "Increment", server_context = "StandardServerContext")]
pub struct IncrementReq {
    pub amount: i32,
}

#[derive(Debug, Serialize, Deserialize, Elm)]
pub struct IncrementRes {
    pub new_value: i32,
}
