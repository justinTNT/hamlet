use std::fs;
use std::path::PathBuf;
use proto_rust::elm_export::{ElmDefinition, ElmEncoder, ElmDecoder};

#[test]
fn generate_elm_types() {
    let mut definitions = Vec::new();
    let mut encoders = Vec::new();
    let mut decoders = Vec::new();

    for def in inventory::iter::<ElmDefinition> {
        if let Some(s) = (def.get_def)() {
            definitions.push(s);
        }
    }
    for enc in inventory::iter::<ElmEncoder> {
        if let Some(s) = (enc.get_enc)() {
            encoders.push(s);
        }
    }
    for dec in inventory::iter::<ElmDecoder> {
        if let Some(s) = (dec.get_dec)() {
            decoders.push(s);
        }
    }

    let elm_module = format!(
        "module Api.Schema exposing (..)\n\n\
         import Json.Decode\n\
         import Json.Encode\n\n\
         -- DEFINITIONS\n\n\
         {}\n\n\
         -- ENCODERS\n\n\
         {}\n\n\
         -- DECODERS\n\n\
         {}",
        definitions.join("\n\n"),
        encoders.join("\n\n"),
        decoders.join("\n\n")
    );

    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("frontend/src/Api/Schema.elm");
    
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }

    fs::write(path, elm_module).unwrap();
}
