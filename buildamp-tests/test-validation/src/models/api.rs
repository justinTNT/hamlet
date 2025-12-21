use buildamp_macro::buildamp;

pub struct StandardServerContext {
    pub dummy: String,
}

#[buildamp(path = "Increment", server_context = "StandardServerContext")]
pub struct IncrementReq {
    pub amount: i32,
}

pub struct IncrementRes {
    pub new_value: i32,
}
