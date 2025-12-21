
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
pub struct TestStorage {
    pub user_id: String,
    pub preferences: TestPreferences,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
pub struct TestPreferences {
    pub theme: String,
    pub notifications: bool,
}
