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

inventory::collect!(ElmDefinition);
inventory::collect!(ElmEncoder);
inventory::collect!(ElmDecoder);
