
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
pub struct TestEntity {
    pub id: i32,
    pub name: String,
    pub created_at: String,
}
