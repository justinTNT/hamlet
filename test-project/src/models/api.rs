use crate::{buildamp_api, buildamp_domain};

#[buildamp_domain]
pub struct StandardServerContext {
    pub dummy: String,
}

#[buildamp_api]
#[api(path = "Increment", server_context = "StandardServerContext")]
pub struct IncrementReq {
    pub amount: i32,
}

#[buildamp_domain]
pub struct IncrementRes {
    pub new_value: i32,
}
