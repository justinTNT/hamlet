
use buildamp_macro::buildamp;

#[buildamp(path = "TestApi")]
pub struct TestApiReq {
    pub name: String,
    pub count: i32,
}

pub struct TestApiRes {
    pub success: bool,
    pub message: String,
}

pub struct TestItem {
    pub id: String,
    pub value: Option<String>,
}
