
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
pub struct TestEvent {
    pub event_id: String,
    pub user_id: String,
    pub data: serde_json::Value,
}
