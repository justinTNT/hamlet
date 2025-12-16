// Imports removed as they are not needed for inventory-based generation
use std::fs::{File, create_dir_all};
use std::io::Write;
// elm_rs traits not needed for this test

#[test]
fn generate_elm_types() {
    // Create directories if they don't exist
    create_dir_all("target/test_output/apps/server/src/Api").expect("Failed to create directories");
    create_dir_all("target/test_output/apps/web/src/Api").expect("Failed to create directories");
    
    let path = "target/test_output/apps/server/src/Api/Backend.elm";
    let mut file = File::create(path).expect("Failed to create file");
    
    writeln!(file, "module Api.Backend exposing (..)").unwrap();
    writeln!(file, "").unwrap();
    writeln!(file, "import Json.Decode").unwrap();
    writeln!(file, "import Json.Encode").unwrap();
    writeln!(file, "import Dict exposing (Dict)").unwrap();
    writeln!(file, "import Set exposing (Set)").unwrap();
    writeln!(file, "").unwrap();
    
    // Collect from inventory
    let definitions: Vec<String> = inventory::iter::<proto_rust::elm_export::ElmDefinition>
        .into_iter()
        .map(|def| (def.get_def)())
        .filter_map(|opt| opt)
        .collect();

    let encoders: Vec<String> = inventory::iter::<proto_rust::elm_export::ElmEncoder>
        .into_iter()
        .map(|enc| (enc.get_enc)())
        .filter_map(|opt| opt)
        .collect();

    let decoders: Vec<String> = inventory::iter::<proto_rust::elm_export::ElmDecoder>
        .into_iter()
        .map(|dec| (dec.get_dec)())
        .filter_map(|opt| opt)
        .collect();
    
    // Write definitions
    for def in &definitions {
        writeln!(file, "{}", def).unwrap();
        writeln!(file, "").unwrap();
    }
    
    // Write Encoders
    for enc in &encoders {
        writeln!(file, "{}", enc).unwrap();
        writeln!(file, "").unwrap();
    }

    // Write Decoders
    for dec in &decoders {
        writeln!(file, "{}", dec).unwrap();
        writeln!(file, "").unwrap();
    }

    // Generate Schema for Web App
    let schema_path = "target/test_output/apps/web/src/Api/Schema.elm";
    let mut schema_file = File::create(schema_path).expect("Failed to create schema file");
    
    writeln!(schema_file, "module Api.Schema exposing (..)").unwrap();
    writeln!(schema_file, "").unwrap();
    writeln!(schema_file, "import Json.Decode").unwrap();
    writeln!(schema_file, "import Json.Encode").unwrap();
    writeln!(schema_file, "import Dict exposing (Dict)").unwrap();
    writeln!(schema_file, "import Set exposing (Set)").unwrap();
    writeln!(schema_file, "").unwrap();

    // Write definitions (same as backend for now)
    for def in &definitions {
        writeln!(schema_file, "{}", def).unwrap();
        writeln!(schema_file, "").unwrap();
    }
    for enc in &encoders {
        writeln!(schema_file, "{}", enc).unwrap();
        writeln!(schema_file, "").unwrap();
    }
    for dec in &decoders {
        writeln!(schema_file, "{}", dec).unwrap();
        writeln!(schema_file, "").unwrap();
    }
}
