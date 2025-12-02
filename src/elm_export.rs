use inventory;

pub struct ElmDefinition {
    pub name: &'static str,
    pub get_def: fn() -> Option<String>,
}

pub struct ElmEncoder {
    pub name: &'static str,
    pub get_enc: fn() -> Option<String>,
}

pub struct ElmDecoder {
    pub name: &'static str,
    pub get_dec: fn() -> Option<String>,
}

pub struct ContextDefinition {
    pub type_name: &'static str,
    pub field_name: &'static str,
    pub source: &'static str,
}

pub struct EndpointDefinition {
    pub endpoint: &'static str,
    pub request_type: &'static str,
    pub context_type: Option<&'static str>,
}

inventory::collect!(ElmDefinition);
inventory::collect!(ElmEncoder);
inventory::collect!(ElmDecoder);
inventory::collect!(ContextDefinition);
inventory::collect!(EndpointDefinition);
