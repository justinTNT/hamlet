use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields, Ident};
use std::path::Path;
use std::fs;

mod buildamp_macros;

#[proc_macro_attribute]
pub fn buildamp_domain(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_domain(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_db(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_db(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_events(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_events(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_storage(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_storage(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_sse(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_sse(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_context_data(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_context_data(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_sse_module(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_sse_module(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_db_module(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_db_module(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_storage_module(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_storage_module(attr, item)
}

#[proc_macro_derive(BuildAmpEndpoint, attributes(api))]
pub fn derive_buildamp_endpoint(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let name_str = name.to_string();

    let mut validation_checks = Vec::new();
    let mut schema_fields = Vec::new();
    let mut endpoint_path = String::new();
    let mut bundle_data: Option<String> = None;
    let mut generate_bundle = false;

    // Parse struct attributes
    for attr in &input.attrs {
        if attr.path().is_ident("api") {
            if let Err(e) = attr.parse_nested_meta(|meta| {
                if name_str == "SubmitCommentReq" {
                    let _key = meta.path.get_ident().unwrap().to_string();
                    // let msg = format!("SubmitCommentReq sees: {}", key);
                    // return Err(syn::Error::new(meta.path.span(), msg));
                }
                if meta.path.is_ident("path") {
                    let content: syn::LitStr = meta.value()?.parse()?;
                    endpoint_path = content.value();
                    return Ok(());
                }
                if meta.path.is_ident("bundle_with") || meta.path.is_ident("server_context") {
                    generate_bundle = true;
                    // compile_error!("Found bundle_with!"); 
                    if let Ok(value) = meta.value() {
                         if let Ok(content) = value.parse::<syn::LitStr>() {
                             bundle_data = Some(content.value());
                         }
                    }
                    return Ok(());
                }
                if meta.path.is_ident("bundle") {
                    generate_bundle = true;
                    return Ok(());
                }
                if meta.path.is_ident("Auth") {
                    validation_checks.push(quote! {
                        if _context.user_id.is_none() {
                            return Err("Unauthorized".to_string());
                        }
                    });
                    return Ok(());
                }
                if meta.path.is_ident("ExtensionOnly") {
                    validation_checks.push(quote! {
                        if !_context.is_extension {
                            return Err("This action is only allowed from the extension".to_string());
                        }
                    });
                    return Ok(());
                }
                Ok(())
            }) {
                return e.to_compile_error().into();
            }
        }
    }

    // Parse field attributes
    if let Data::Struct(data) = input.data {
        if let Fields::Named(fields) = data.fields {
            for field in &fields.named {
                let field_name = field.ident.as_ref().unwrap();
                let field_name_str = field_name.to_string();
                let ty = &field.ty;
                
                // Schema logic variables
                let mut min_len: Option<usize> = None;
                let mut max_len: Option<usize> = None;
                let mut is_required = false;
                let mut is_injected = false;
                let mut format: Option<String> = None;

                for attr in &field.attrs {
                    if attr.path().is_ident("api") {
                        let _ = attr.parse_nested_meta(|meta| {
                            // #[horatio(Trim)]
                            if meta.path.is_ident("Trim") {
                                validation_checks.push(quote! {
                                    self.#field_name = self.#field_name.trim().to_string();
                                });
                                return Ok(());
                            }

                            // #[horatio(MaxLength(5))]
                            if meta.path.is_ident("MaxLength") {
                                let content;
                                syn::parenthesized!(content in meta.input);
                                let lit: syn::LitInt = content.parse()?;
                                let len: usize = lit.base10_parse()?;
                                max_len = Some(len);
                                
                                let error_msg = format!("{} must be at most {} characters/items", field_name_str, len);
                                validation_checks.push(quote! {
                                    if self.#field_name.len() > #len {
                                        return Err(#error_msg.to_string());
                                    }
                                });
                                return Ok(());
                            }

                            // #[horatio(Inject = "user_id")]
                            if meta.path.is_ident("Inject") {
                                let content: syn::LitStr = meta.value()?.parse()?;
                                let context_field = syn::Ident::new(&content.value(), content.span());
                                is_injected = true;
                                validation_checks.push(quote! {
                                    self.#field_name = _context.#context_field.clone();
                                });
                                return Ok(());
                            }

                            // #[horatio(ReadOnly)]
                            if meta.path.is_ident("ReadOnly") {
                                is_injected = true; // Treat as injected (hidden/overwritten)
                                validation_checks.push(quote! {
                                    self.#field_name = Default::default();
                                });
                                return Ok(());
                            }

                            // #[horatio(Required)]
                            if meta.path.is_ident("Required") {
                                is_required = true;
                                let error_msg = format!("{} is required", field_name_str);
                                validation_checks.push(quote! {
                                    if self.#field_name.is_empty() {
                                        return Err(#error_msg.to_string());
                                    }
                                });
                                return Ok(());
                            }
                            
                            // #[horatio(MinLength(3))]
                            if meta.path.is_ident("MinLength") {
                                let content;
                                syn::parenthesized!(content in meta.input);
                                let lit: syn::LitInt = content.parse()?;
                                let len: usize = lit.base10_parse()?;
                                min_len = Some(len);

                                let error_msg = format!("{} must be at least {} characters", field_name_str, len);
                                validation_checks.push(quote! {
                                    if self.#field_name.len() < #len {
                                        return Err(#error_msg.to_string());
                                    }
                                });
                                return Ok(());
                            }

                            // #[horatio(Url)]
                            if meta.path.is_ident("Url") {
                                format = Some("uri".to_string()); // OpenAPI format
                                let error_msg = format!("{} must be a valid URL", field_name_str);
                                validation_checks.push(quote! {
                                    if !self.#field_name.is_empty() && !self.#field_name.starts_with("http://") && !self.#field_name.starts_with("https://") {
                                        return Err(#error_msg.to_string());
                                    }
                                });
                                return Ok(());
                            }

                            // #[horatio(Email)]
                            if meta.path.is_ident("Email") {
                                format = Some("email".to_string()); // OpenAPI format
                                let error_msg = format!("{} is invalid", field_name_str);
                                validation_checks.push(quote! {
                                    if !self.#field_name.contains('@') {
                                        return Err(#error_msg.to_string());
                                    }
                                });
                                return Ok(());
                            }

                            // #[horatio(Default = "value")]
                            if meta.path.is_ident("Default") {
                                let content: syn::LitStr = meta.value()?.parse()?;
                                let default_val = content.value();

                                // Determine if the field is an Option<T>
                                let is_option = if let syn::Type::Path(type_path) = ty {
                                    type_path.path.segments.last().map_or(false, |segment| {
                                        segment.ident == "Option"
                                    })
                                } else {
                                    false
                                };

                                if is_option {
                                    validation_checks.push(quote! {
                                        if self.#field_name.is_none() {
                                            self.#field_name = Some(#default_val.to_string().into());
                                        }
                                    });
                                } else {
                                    validation_checks.push(quote! {
                                        // println!("Checking default for {}: is_empty={}", #field_name_str, self.#field_name.is_empty());
                                        if self.#field_name.is_empty() {
                                            self.#field_name = #default_val.to_string().into();
                                        }
                                    });
                                }
                                return Ok(());
                            }
                            Ok(())
                        });
                    }
                }

                // Generate Schema Code for this field
                let min_len_tokens = match min_len {
                    Some(l) => quote! { Some(#l) },
                    None => quote! { None },
                };
                let max_len_tokens = match max_len {
                    Some(l) => quote! { Some(#l) },
                    None => quote! { None },
                };
                let format_tokens = match format {
                    Some(f) => quote! { Some(#f.to_string()) },
                    None => quote! { None },
                };

                // If injected, we might want to hide it or mark readOnly.
                // For now, let's just not require it.
                if is_required && !is_injected {
                    schema_fields.push(quote! {
                        builder = builder.required(#field_name_str);
                    });
                }

                // Detect if type is Vec
                let is_vec = if let syn::Type::Path(type_path) = ty {
                    if let Some(segment) = type_path.path.segments.last() {
                        segment.ident == "Vec"
                    } else {
                        false
                    }
                } else {
                    false
                };

                schema_fields.push(quote! {
                    let ref_or_schema: utoipa::openapi::RefOr<utoipa::openapi::schema::Schema> = utoipa::schema!(#ty).into();
                    
                    let mut has_constraints = false;
                    
                    let constraint_schema = if #is_vec {
                        let mut constraints = utoipa::openapi::schema::ArrayBuilder::new();
                        if let Some(min) = #min_len_tokens {
                            constraints = constraints.min_items(Some(min));
                            has_constraints = true;
                        }
                        if let Some(max) = #max_len_tokens {
                            constraints = constraints.max_items(Some(max));
                            has_constraints = true;
                        }
                        // ArrayBuilder builds Array, which wraps Object? No, Schema::Array(Array)
                        utoipa::openapi::schema::Schema::Array(constraints.build())
                    } else {
                        let mut constraints = utoipa::openapi::schema::ObjectBuilder::new();
                        if let Some(min) = #min_len_tokens {
                            constraints = constraints.min_length(Some(min));
                            has_constraints = true;
                        }
                        if let Some(max) = #max_len_tokens {
                            constraints = constraints.max_length(Some(max));
                            has_constraints = true;
                        }
                        if let Some(fmt) = #format_tokens {
                            constraints = constraints.format(Some(utoipa::openapi::schema::SchemaFormat::Custom(fmt)));
                            has_constraints = true;
                        }
                        utoipa::openapi::schema::Schema::Object(constraints.build())
                    };

                    if has_constraints {
                        let all_of = utoipa::openapi::schema::AllOfBuilder::new()
                            .item(ref_or_schema)
                            .item(constraint_schema)
                            .build();
                        builder = builder.property(#field_name_str, utoipa::openapi::schema::Schema::AllOf(all_of));
                    } else {
                        builder = builder.property(#field_name_str, ref_or_schema);
                    }
                });
            }
        }
    }

    let bundle_struct = if generate_bundle {
        let bundle_name = Ident::new(&format!("{}Bundle", name), name.span());
        let data_field = if let Some(ref data) = bundle_data {
            let data_ident = Ident::new(&data, name.span());
            quote! {
                #[serde(flatten)]
                pub data: #data_ident,
            }
        } else {
             quote! {}
        };
        quote! {
            #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
            pub struct #bundle_name {
                pub context: crate::ServerContext,
                pub input: #name,
                #data_field
            }
        }

    } else {
        quote! {}
    };

    let context_type_option = if let Some(data) = &bundle_data {
        quote! { Some(#data) }
    } else {
        quote! { None }
    };

    let expanded = quote! {
        impl #name {
            pub fn validate(&mut self, _context: &crate::Context) -> Result<(), String> {
                #(#validation_checks)*
                Ok(())
            }

            pub fn endpoint_path() -> &'static str {
                #endpoint_path
            }
        }

        impl<'__s> utoipa::ToSchema<'__s> for #name {
            fn schema() -> (&'__s str, utoipa::openapi::RefOr<utoipa::openapi::schema::Schema>) {
                use utoipa::openapi::schema::{ObjectBuilder, SchemaType, Schema};
                use utoipa::ToSchema;
                
                let mut builder = ObjectBuilder::new().schema_type(SchemaType::Object);
                
                #(#schema_fields)*

                let schema = builder.build();

                (#name_str, utoipa::openapi::RefOr::T(Schema::Object(schema)))
            }
        }

        #bundle_struct

        inventory::submit! {
            crate::elm_export::EndpointDefinition {
                endpoint: #endpoint_path,
                request_type: stringify!(#name),
                context_type: #context_type_option,
            }
        }
    };
    TokenStream::from(expanded)
}

enum Entry {
    Endpoint(syn::Path, syn::Path),
    Schema(syn::Path),
}

struct DispatcherInput {
    entries: syn::punctuated::Punctuated<Entry, syn::Token![,]>,
}

impl syn::parse::Parse for DispatcherInput {
    fn parse(input: syn::parse::ParseStream) -> syn::Result<Self> {
        let entries = syn::punctuated::Punctuated::parse_terminated_with(input, |stream| {
            if stream.peek(syn::token::Paren) {
                let content;
                syn::parenthesized!(content in stream);
                let req: syn::Path = content.parse()?;
                content.parse::<syn::Token![,]>()?;
                let res: syn::Path = content.parse()?;
                Ok(Entry::Endpoint(req, res))
            } else {
                let ty: syn::Path = stream.parse()?;
                Ok(Entry::Schema(ty))
            }
        })?;
        Ok(DispatcherInput { entries })
    }
}

#[proc_macro]
pub fn generate_dispatcher(input: TokenStream) -> TokenStream {
    let DispatcherInput { entries } = parse_macro_input!(input as DispatcherInput);

    let arms = entries.iter().filter_map(|entry| {
        match entry {
            Entry::Endpoint(ty, _) => Some(quote! {
                path if path == <#ty>::endpoint_path() => {
                    match serde_json::from_str::<#ty>(&wire) {
                        Ok(mut req) => {
                            // Context is passed from outer scope
                            if let Err(e) = req.validate(&context) {
                                 let error = ApiResponse::<()>::Error(ApiError::ValidationError {
                                    details: e,
                                });
                                return serde_json::to_string(&error).unwrap_or_else(|_| "{}".to_string());
                            }
                            wire
                        },
                        Err(e) => {
                            let error = ApiResponse::<()>::Error(ApiError::ValidationError {
                                details: format!("Invalid request: {}", e),
                            });
                            serde_json::to_string(&error).unwrap_or_else(|_| "{}".to_string())
                        }
                    }
                }
            }),
            Entry::Schema(_) => None,
        }
    });

    let expanded = quote! {
        match endpoint.as_str() {
            #(#arms)*
            _ => {
                 let error = ApiResponse::<()>::Error(ApiError::NotFound {
                    details: format!("Unknown endpoint: {}", endpoint),
                });
                serde_json::to_string(&error).unwrap_or_else(|_| "{}".to_string())
            }
        }
    };

    TokenStream::from(expanded)
}

#[proc_macro]
pub fn generate_openapi_spec(input: TokenStream) -> TokenStream {
    let DispatcherInput { entries } = parse_macro_input!(input as DispatcherInput);

    let path_additions = entries.iter().filter_map(|entry| {
        match entry {
            Entry::Endpoint(req_ty, res_ty) => Some(quote! {
                {
                    let path_name = <#req_ty>::endpoint_path();
                    let (req_schema_name, _) = <#req_ty as utoipa::ToSchema>::schema();
                    let (res_schema_name, _) = <#res_ty as utoipa::ToSchema>::schema();
                    
                    let operation = utoipa::openapi::path::OperationBuilder::new()
                        .request_body(Some(utoipa::openapi::request_body::RequestBodyBuilder::new()
                            .content("application/json", utoipa::openapi::content::ContentBuilder::new()
                                .schema(utoipa::openapi::schema::Ref::from_schema_name(req_schema_name))
                                .build())
                            .build()))
                        .response("200", utoipa::openapi::ResponseBuilder::new()
                            .description("Success")
                            .content("application/json", utoipa::openapi::content::ContentBuilder::new()
                                .schema(utoipa::openapi::schema::Ref::from_schema_name(res_schema_name))
                                .build())
                            .build())
                        .build();

                    let path_item = utoipa::openapi::path::PathItemBuilder::new()
                        .operation(utoipa::openapi::path::PathItemType::Post, operation)
                        .build();
                        
                    openapi.paths.paths.insert(format!("/{}", path_name), path_item);
                }
            }),
            Entry::Schema(_) => None,
        }
    });

    // Collect all types for schemas
    let all_types = entries.iter().flat_map(|entry| {
        match entry {
            Entry::Endpoint(req, res) => vec![req, res],
            Entry::Schema(ty) => vec![ty],
        }
    });
    let all_types_tokens = quote! { #(#all_types),* };

    let expanded = quote! {
        #[derive(utoipa::OpenApi)]
        #[openapi(components(schemas(#all_types_tokens)))]
        struct ApiDoc;

        pub fn get_openapi_spec() -> String {
            use utoipa::ToSchema; // Ensure trait is in scope
            let mut openapi = <ApiDoc as utoipa::OpenApi>::openapi();
            
            #(#path_additions)*
            
            openapi.to_json().unwrap()
        }
    };

    TokenStream::from(expanded)
}
// ... (Dispatcher and OpenAPI macros remain unchanged)

#[proc_macro_derive(BuildAmpElm)]
pub fn derive_buildamp_elm(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = input.ident;

    let expanded = quote! {
        inventory::submit! {
            crate::elm_export::ElmDefinition {
                name: stringify!(#name),
                get_def: <#name as elm_rs::Elm>::elm_definition,
            }
        }
        inventory::submit! {
            crate::elm_export::ElmEncoder {
                name: stringify!(#name),
                get_enc: <#name as elm_rs::ElmEncode>::encoder_definition,
            }
        }
        inventory::submit! {
            crate::elm_export::ElmDecoder {
                name: stringify!(#name),
                get_dec: <#name as elm_rs::ElmDecode>::decoder_definition,
            }
        }
    };
    TokenStream::from(expanded)
}
#[proc_macro_derive(BuildAmpContext, attributes(dependency))]
pub fn derive_buildamp_context(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = input.ident;
    let name_str = name.to_string();

    let mut context_registrations = Vec::new();

    if let Data::Struct(data) = input.data {
        if let Fields::Named(fields) = data.fields {
            for field in fields.named {
                let field_name = field.ident.unwrap();
                let field_name_str = field_name.to_string();

                for attr in field.attrs {
                    if attr.path().is_ident("dependency") {
                        let _ = attr.parse_nested_meta(|meta| {
                            if meta.path.is_ident("source") {
                                let content: syn::LitStr = meta.value()?.parse()?;
                                let source = content.value();
                                
                                context_registrations.push(quote! {
                                    inventory::submit! {
                                        crate::elm_export::ContextDefinition {
                                            type_name: #name_str,
                                            field_name: #field_name_str,
                                            source: #source,
                                        }
                                    }
                                });
                                return Ok(());
                            }
                            Ok(())
                        });
                    }
                }
            }
        }
    }

    let expanded = quote! {
        #(#context_registrations)*
    };
    TokenStream::from(expanded)
}

/// Auto-discover and include all .rs files in the models directory
/// Usage: buildamp_auto_discover_models!("src/models");
#[proc_macro]
pub fn buildamp_auto_discover_models(input: TokenStream) -> TokenStream {
    use syn::LitStr;
    
    let models_dir = parse_macro_input!(input as LitStr);
    let models_path = models_dir.value();
    
    let mut module_declarations = Vec::new();
    let mut module_exports = Vec::new();
    
    // Recursively scan the models directory
    if let Ok(entries) = scan_models_dir(&models_path) {
        for entry in entries {
            let module_name = syn::Ident::new(&entry.module_name, proc_macro2::Span::call_site());
            let file_path = entry.file_path.clone();
            
            // Read and enhance the source file at compile time
            let enhanced_module = match entry.model_type {
                ModelType::Database => {
                    // Generate enhanced database module with auto-applied decorations
                    generate_enhanced_db_module(&module_name, &file_path)
                },
                ModelType::Api => {
                    // Generate enhanced API module with auto-applied decorations  
                    generate_enhanced_api_module(&module_name, &file_path)
                },
                ModelType::Storage => {
                    // Generate enhanced storage module with auto-applied decorations
                    generate_enhanced_storage_module(&module_name, &file_path)
                },
                ModelType::Sse => {
                    // Generate enhanced SSE module with auto-applied decorations
                    generate_enhanced_sse_module(&module_name, &file_path)
                },
                _ => {
                    quote! {
                        #[path = #file_path]
                        pub mod #module_name;
                    }
                }
            };
            
            module_declarations.push(enhanced_module);
            
            // If it's an API file, add to exports
            if entry.is_api {
                module_exports.push(quote! {
                    pub use #module_name::*;
                });
            }
        }
    }
    
    TokenStream::from(quote! {
        // Enhanced module declarations with auto-applied decorations
        #(#module_declarations)*
        
        // Re-exports
        #(#module_exports)*
    })
}

#[derive(Debug)]
struct ModelEntry {
    module_name: String,
    file_path: String,
    is_api: bool,
    model_type: ModelType,
}

#[derive(Debug, PartialEq)]
enum ModelType {
    Api,
    Database,
    Events,
    Storage,
    Sse,
    Other,
}

fn scan_models_dir(dir_path: &str) -> std::io::Result<Vec<ModelEntry>> {
    let mut entries = Vec::new();
    scan_directory(Path::new(dir_path), "", &mut entries)?;
    Ok(entries)
}

fn scan_directory(
    dir: &Path, 
    prefix: &str, 
    entries: &mut Vec<ModelEntry>
) -> std::io::Result<()> {
    
    if !dir.exists() {
        return Ok(());
    }
    
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                if file_name.ends_with(".rs") && file_name != "mod.rs" {
                    let module_name = if prefix.is_empty() {
                        file_name.trim_end_matches(".rs").to_string()
                    } else {
                        format!("{}_{}", prefix, file_name.trim_end_matches(".rs"))
                    };
                    
                    let relative_path = path.strip_prefix("src/").unwrap_or(&path);
                    let file_path = relative_path.to_string_lossy().to_string();
                    
                    let is_api = file_name.ends_with("_api.rs");
                    
                    // Determine model type based on directory
                    let model_type = if is_api {
                        ModelType::Api
                    } else if prefix.contains("db") {
                        ModelType::Database
                    } else if prefix.contains("events") {
                        ModelType::Events
                    } else if prefix.contains("storage") {
                        ModelType::Storage
                    } else if prefix.contains("sse") {
                        ModelType::Sse
                    } else {
                        ModelType::Other
                    };
                    
                    entries.push(ModelEntry {
                        module_name,
                        file_path,
                        is_api,
                        model_type,
                    });
                }
            }
        } else if path.is_dir() {
            if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                let new_prefix = if prefix.is_empty() {
                    dir_name.to_string()
                } else {
                    format!("{}_{}", prefix, dir_name)
                };
                scan_directory(&path, &new_prefix, entries)?;
            }
        }
    }
    
    Ok(())
}

// Helper functions to generate enhanced modules with auto-applied decorations

fn generate_enhanced_db_module(module_name: &syn::Ident, file_path: &str) -> proc_macro2::TokenStream {
    match read_and_enhance_structs(file_path, &DatabaseDecorations) {
        Ok(enhanced_content) => {
            quote! {
                pub mod #module_name {
                    use super::*;
                    #enhanced_content
                }
            }
        },
        Err(_) => {
            // Fallback to simple include if enhancement fails
            quote! {
                #[path = #file_path]
                pub mod #module_name;
            }
        }
    }
}

fn generate_enhanced_api_module(module_name: &syn::Ident, file_path: &str) -> proc_macro2::TokenStream {
    match read_and_enhance_structs(file_path, &ApiDecorations) {
        Ok(enhanced_content) => {
            quote! {
                pub mod #module_name {
                    use super::*;
                    #enhanced_content
                }
            }
        },
        Err(_) => {
            quote! {
                #[path = #file_path]
                pub mod #module_name;
            }
        }
    }
}

fn generate_enhanced_storage_module(module_name: &syn::Ident, file_path: &str) -> proc_macro2::TokenStream {
    match read_and_enhance_structs(file_path, &StorageDecorations) {
        Ok(enhanced_content) => {
            quote! {
                pub mod #module_name {
                    use super::*;
                    #enhanced_content
                }
            }
        },
        Err(_) => {
            quote! {
                #[path = #file_path]
                pub mod #module_name;
            }
        }
    }
}

fn generate_enhanced_sse_module(module_name: &syn::Ident, file_path: &str) -> proc_macro2::TokenStream {
    match read_and_enhance_structs(file_path, &SseDecorations) {
        Ok(enhanced_content) => {
            quote! {
                pub mod #module_name {
                    use super::*;
                    #enhanced_content
                }
            }
        },
        Err(_) => {
            quote! {
                #[path = #file_path]
                pub mod #module_name;
            }
        }
    }
}

// Trait for different decoration strategies
trait DecorationStrategy {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct);
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum);
}

struct DatabaseDecorations;
impl DecorationStrategy for DatabaseDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        };
        item_struct.attrs.insert(0, derives);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        };
        item_enum.attrs.insert(0, derives);
    }
}

struct ApiDecorations;
impl DecorationStrategy for ApiDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        // Check if struct already has #[buildamp] attribute (request structs)
        let has_buildamp = item_struct.attrs.iter().any(|attr| {
            attr.path().is_ident("buildamp")
        });
        
        // Apply decorations to all structs except those with #[buildamp] attribute
        if !has_buildamp {
            let derives: syn::Attribute = syn::parse_quote! {
                #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
            };
            item_struct.attrs.insert(0, derives);
        }
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        };
        item_enum.attrs.insert(0, derives);
    }
}

struct StorageDecorations;
impl DecorationStrategy for StorageDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
        };
        item_struct.attrs.insert(0, derives);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
        };
        item_enum.attrs.insert(0, derives);
    }
}

struct SseDecorations;
impl DecorationStrategy for SseDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        };
        item_struct.attrs.insert(0, derives);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        };
        item_enum.attrs.insert(0, derives);
        
        // Add serde tag for SSE enums
        let serde_tag: syn::Attribute = syn::parse_quote! {
            #[serde(tag = "type", content = "data")]
        };
        item_enum.attrs.insert(1, serde_tag);
    }
}

fn read_and_enhance_structs(file_path: &str, strategy: &dyn DecorationStrategy) -> Result<proc_macro2::TokenStream, Box<dyn std::error::Error>> {
    let full_path = format!("src/{}", file_path);
    let content = fs::read_to_string(&full_path)?;
    let ast = syn::parse_file(&content)?;
    
    let mut enhanced_items = Vec::new();
    
    for item in ast.items {
        match item {
            syn::Item::Struct(mut item_struct) => {
                strategy.apply_to_struct(&mut item_struct);
                enhanced_items.push(syn::Item::Struct(item_struct));
            },
            syn::Item::Enum(mut item_enum) => {
                strategy.apply_to_enum(&mut item_enum);
                enhanced_items.push(syn::Item::Enum(item_enum));
            },
            _ => enhanced_items.push(item),
        }
    }
    
    Ok(quote! {
        #(#enhanced_items)*
    })
}
