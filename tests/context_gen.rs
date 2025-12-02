use proto_rust::elm_export;

#[test]
fn generate_context_manifest() {
    let definitions: Vec<String> = inventory::iter::<elm_export::ContextDefinition>
        .into_iter()
        .map(|def| {
            format!("{}::{} -> {}", def.type_name, def.field_name, def.source)
        })
        .collect();

    println!("Found {} context definitions", definitions.len());
    for def in &definitions {
        println!("{}", def);
    }

    assert!(definitions.iter().any(|d| d.contains("SubmitItemData::existing_tags -> table:tags")));

    let endpoints: Vec<String> = inventory::iter::<elm_export::EndpointDefinition>
        .into_iter()
        .map(|def| {
            format!("{} -> {} (Context: {:?})", def.endpoint, def.request_type, def.context_type)
        })
        .collect();

    println!("Found {} endpoint definitions", endpoints.len());
    for def in &endpoints {
        println!("{}", def);
    }

    assert!(endpoints.iter().any(|d| d.contains("SubmitItem -> SubmitItemReq (Context: Some(\"SubmitItemData\"))")));
}
