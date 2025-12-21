
use buildamp_macro::buildamp;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
#[buildamp(path = "TestApi")]
pub struct TestApiReq {
    pub name: String,
    pub count: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
pub struct TestApiRes {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
pub struct TestItem {
    pub id: String,
    pub value: Option<String>,
}
