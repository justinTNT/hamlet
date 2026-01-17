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

/// Auto-detect app models directory
fn auto_detect_app_models_dir() -> String {
    // Get the manifest directory (where Cargo.toml is located)
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
    let base_path = std::path::Path::new(&manifest_dir);
    
    // Look for app/*/models directories
    let app_path = base_path.join("app");
    if let Ok(app_dir) = std::fs::read_dir(&app_path) {
        for app_entry in app_dir.flatten() {
            if app_entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                let models_path = app_entry.path().join("models");
                if models_path.exists() {
                    return models_path.to_string_lossy().to_string();
                }
            }
        }
    }
    
    // Fallback to src/models for compatibility
    base_path.join("src/models").to_string_lossy().to_string()
}

/// Extract actual struct names from API file content with module info
fn extract_api_struct_names(file_path: &str, module_name: &str) -> Result<Vec<(String, String)>, std::io::Error> {
    // Use absolute path
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
    let absolute_path = std::path::Path::new(&manifest_dir).join(file_path);
    let content = std::fs::read_to_string(&absolute_path)?;
    let mut struct_names = Vec::new();
    
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("pub struct ") {
            if let Some(struct_name) = line
                .strip_prefix("pub struct ")
                .and_then(|rest| rest.split_whitespace().next())
                .map(|name| name.trim_end_matches('{'))
            {
                // Only include structs that end with Req or Res (API types)
                if struct_name.ends_with("Req") || struct_name.ends_with("Res") {
                    struct_names.push(struct_name.to_string());
                }
            }
        }
    }
    
    // Extract base names with module info (e.g., ("feed", "GetFeed"))
    let mut base_names_with_module = Vec::new();
    for name in struct_names {
        if let Some(base) = name.strip_suffix("Req").or_else(|| name.strip_suffix("Res")) {
            if !base_names_with_module.iter().any(|(_, b)| b == base) {
                base_names_with_module.push((module_name.to_string(), base.to_string()));
            }
        }
    }
    
    Ok(base_names_with_module)
}

/// Generate API functions based on discovered API models
fn generate_wasm_functions(api_models: &[(String, String)]) -> proc_macro2::TokenStream {
    if api_models.is_empty() {
        return quote! {
            // No API models found - generating placeholder functions
            pub fn dispatcher(_endpoint: String, _wire: String, _context_json: String) -> String {
                "{}".to_string()
            }

            pub fn get_openapi_spec() -> String {
                "{}".to_string()
            }

            pub fn decode_response(_endpoint: String, wire: String) -> String {
                wire
            }
        };
    }

    // Generate dispatcher pairs with correct module paths
    let dispatcher_pairs: Vec<_> = api_models.iter().map(|(module, base_name)| {
        let module_ident = syn::Ident::new(module, proc_macro2::Span::call_site());
        let req_ident = syn::Ident::new(&format!("{}Req", base_name), proc_macro2::Span::call_site());
        let res_ident = syn::Ident::new(&format!("{}Res", base_name), proc_macro2::Span::call_site());
        quote! { (crate::models::api::#module_ident::#req_ident, crate::models::api::#module_ident::#res_ident) }
    }).collect();

    // Generate decode response cases
    let decode_cases: Vec<_> = api_models.iter().map(|(module, base_name)| {
        let module_ident = syn::Ident::new(module, proc_macro2::Span::call_site());
        let endpoint = base_name.clone();
        let res_type = syn::Ident::new(&format!("{}Res", base_name), proc_macro2::Span::call_site());
        quote! {
            if endpoint == #endpoint {
                if let Ok(_) = serde_json::from_str::<crate::models::api::#module_ident::#res_type>(&wire) {
                    return wire;
                }
            }
        }
    }).collect();

    quote! {
        pub fn dispatcher(endpoint: String, wire: String, context_json: String) -> String {
            use buildamp_macro::generate_dispatcher;
            let context: crate::framework::common::Context = serde_json::from_str(&context_json).unwrap_or_default();
            generate_dispatcher!(#(#dispatcher_pairs),*)
        }

        pub fn get_openapi_spec() -> String {
            use buildamp_macro::generate_openapi_spec;
            generate_openapi_spec!(#(#dispatcher_pairs),*);
            get_openapi_spec()
        }

        pub fn decode_response(endpoint: String, wire: String) -> String {
            #(#decode_cases)*
            wire
        }
    }
}

/// Auto-discover and include all .rs files in app model directories
/// Usage: buildamp_auto_discover_models!();
#[proc_macro]
pub fn buildamp_auto_discover_models(_input: TokenStream) -> TokenStream {
    // Auto-detect app directories under app/*/models
    let models_path = auto_detect_app_models_dir();
    
    let mut module_declarations = Vec::new();
    let mut wasm_functions = quote! {}; // Default empty
    let mut entries_list = Vec::new();
    let mut infrastructure_module = quote! {}; // Separate infrastructure module
    
    // Recursively scan the models directory
    if let Ok(entries) = scan_models_dir(&models_path) {
        entries_list = entries;
        // Detect required infrastructure based on model types
        let mut detected_types = std::collections::HashSet::new();
        let mut has_events = false;
        
        for entry in &entries_list {
            detected_types.insert(entry.model_type);
            if entry.model_type == ModelType::Events {
                has_events = true;
            }
        }
        
        // Generate infrastructure functions if events models detected
        if has_events {
            infrastructure_module = quote! {
                // Auto-generated infrastructure functions when events models detected
                pub mod buildamp_infrastructure {
                    use super::*;
                    
                    /// Returns SQL to auto-install events infrastructure
                    /// Called by framework when events models are detected
                    pub fn get_events_infrastructure_sql() -> &'static str {
                        crate::framework::database_infrastructure::DatabaseInfrastructure::get_events_table_sql()
                    }
                    
                    /// Returns infrastructure manifest for debugging
                    pub fn get_infrastructure_manifest() -> std::collections::HashMap<String, serde_json::Value> {
                        crate::framework::database_infrastructure::DatabaseInfrastructure::generate_infrastructure_manifest()
                    }
                    
                    /// Indicates events infrastructure is required
                    pub const REQUIRES_EVENTS_INFRASTRUCTURE: bool = true;
                }
            };
        } else {
            infrastructure_module = quote! {
                // No infrastructure required - no events models detected
                pub mod buildamp_infrastructure {
                    pub const REQUIRES_EVENTS_INFRASTRUCTURE: bool = false;
                    
                    pub fn get_events_infrastructure_sql() -> &'static str {
                        "-- No events infrastructure required"
                    }
                    
                    pub fn get_infrastructure_manifest() -> std::collections::HashMap<String, serde_json::Value> {
                        std::collections::HashMap::new()
                    }
                }
            };
        }
        
        // Collect API models for WASM function generation
        let mut api_models = Vec::new();
        
        for entry in &entries_list {
            if entry.is_api {
                // Extract actual struct names from file content with module info
                if let Ok(struct_names) = extract_api_struct_names(&entry.file_path, &entry.module_name) {
                    api_models.extend(struct_names);
                }
            }
        }
        
        for entry in &entries_list {
            let module_name = syn::Ident::new(&entry.module_name, proc_macro2::Span::call_site());
            let file_path = entry.file_path.clone();
            
            // Use simple path-based include for all modules
            let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
            let absolute_path = std::path::Path::new(&manifest_dir).join(&file_path);
            let absolute_path_str = absolute_path.to_string_lossy();
            
            let enhanced_module = quote! {
                #[path = #absolute_path_str]
                pub mod #module_name;
            };
            
            module_declarations.push(enhanced_module);
            
            // Note: We handle exports differently now
        }
        
        // Generate WASM functions based on discovered API models
        wasm_functions = generate_wasm_functions(&api_models);
    }
    
    // Group modules by type
    let mut api_modules = Vec::new();
    let mut db_modules = Vec::new();
    let mut storage_modules = Vec::new();
    let mut events_modules = Vec::new();
    let mut sse_modules = Vec::new();
    
    for (decl, entry) in module_declarations.iter().zip(entries_list.iter()) {
        match entry.model_type {
            ModelType::Api => api_modules.push(decl),
            ModelType::Database => db_modules.push(decl),
            ModelType::Storage => storage_modules.push(decl),
            ModelType::Events => events_modules.push(decl),
            ModelType::Sse => sse_modules.push(decl),
            _ => {}
        }
    }
    
    // Generate all API module paths for re-exports
    let api_exports: Vec<_> = api_modules.iter().enumerate().map(|(i, _)| {
        if let Some(entry) = entries_list.iter().filter(|e| e.model_type == ModelType::Api).nth(i) {
            let module_name = syn::Ident::new(&entry.module_name, proc_macro2::Span::call_site());
            quote! { pub use api::#module_name::*; }
        } else {
            quote! {}
        }
    }).collect();

    TokenStream::from(quote! {
        // Infrastructure module at top level
        #infrastructure_module
        
        // Auto-generated module structure
        pub mod api {
            use crate::*;
            #(#api_modules)*
            
            // API types will be re-exported at the models level
        }
        
        pub mod db {
            use crate::*;
            #(#db_modules)*
        }
        
        pub mod storage {
            use crate::*;
            #(#storage_modules)*
        }
        
        pub mod events {
            use crate::*;
            #(#events_modules)*
        }
        
        pub mod sse {
            use crate::*;
            #(#sse_modules)*
        }
        
        // Re-exports from api module for convenience
        pub use api::*;
        
        // Auto-generated WASM functions based on discovered API models
        #wasm_functions
    })
}

#[derive(Debug)]
struct ModelEntry {
    module_name: String,
    file_path: String,
    is_api: bool,
    model_type: ModelType,
}

#[derive(Debug, PartialEq, Eq, Hash, Copy, Clone)]
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
                    // Don't prefix module names - use clean names
                    let module_name = file_name.trim_end_matches(".rs").to_string();
                    
                    // Path is already relative from the project root
                    let file_path = path.to_string_lossy().to_string();
                    
                    // Determine model type based on directory structure
                    let model_type = if prefix.contains("api") {
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
                    
                    let is_api = model_type == ModelType::Api;
                    
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
                    use crate::*;
                    #enhanced_content
                }
            }
        },
        Err(_) => {
            // Fallback to simple include if enhancement fails
            // Use CARGO_MANIFEST_DIR to create absolute path
            // Use absolute path
            let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
            let absolute_path = std::path::Path::new(&manifest_dir).join(file_path);
            let absolute_path_str = absolute_path.to_string_lossy();
            quote! {
                #[path = #absolute_path_str]
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
                    use crate::*;
                    #enhanced_content
                }
            }
        },
        Err(_) => {
            // Fallback to simple include if enhancement fails
            let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
            let absolute_path = std::path::Path::new(&manifest_dir).join(file_path);
            let absolute_path_str = absolute_path.to_string_lossy();
            quote! {
                #[path = #absolute_path_str]
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
                    use crate::*;
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
                    use crate::*;
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

fn generate_enhanced_events_module(module_name: &syn::Ident, file_path: &str) -> proc_macro2::TokenStream {
    match read_and_enhance_structs(file_path, &EventsDecorations) {
        Ok(enhanced_content) => {
            quote! {
                pub mod #module_name {
                    use crate::*;
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
        // Check if struct already has derive attributes
        if has_existing_derives(item_struct) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        };
        item_struct.attrs.insert(0, derives);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        // Check if enum already has derive attributes
        if has_existing_derives_enum(item_enum) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        };
        item_enum.attrs.insert(0, derives);
    }
}

struct ApiDecorations;
impl DecorationStrategy for ApiDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        // Skip structs that already have #[buildamp] attributes - they get decorations from the attribute macro
        let has_buildamp_attr = item_struct.attrs.iter().any(|attr| {
            attr.path().is_ident("buildamp")
        });
        
        // Also skip if struct already has any derive attributes
        if has_buildamp_attr || has_existing_derives(item_struct) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        };
        item_struct.attrs.insert(0, derives);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        // Check if enum already has derive attributes
        if has_existing_derives_enum(item_enum) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        };
        item_enum.attrs.insert(0, derives);
    }
}

struct StorageDecorations;
impl DecorationStrategy for StorageDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        // Check if struct already has derive attributes
        if has_existing_derives(item_struct) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
        };
        item_struct.attrs.insert(0, derives);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        // Check if enum already has derive attributes
        if has_existing_derives_enum(item_enum) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
        };
        item_enum.attrs.insert(0, derives);
    }
}

struct SseDecorations;
impl DecorationStrategy for SseDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        // Check if struct already has derive attributes
        if has_existing_derives(item_struct) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        };
        item_struct.attrs.insert(0, derives);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        // Check if enum already has derive attributes
        if has_existing_derives_enum(item_enum) {
            return; // Skip if already decorated
        }
        
        // Check if enum already has serde tag attributes
        // For now, simplify by checking if any serde attribute exists
        let has_serde_tag = item_enum.attrs.iter().any(|attr| {
            attr.path().is_ident("serde")
        });
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        };
        item_enum.attrs.insert(0, derives);
        
        // Add serde tag for SSE enums only if not already present
        if !has_serde_tag {
            let serde_tag: syn::Attribute = syn::parse_quote! {
                #[serde(tag = "type", content = "data")]
            };
            item_enum.attrs.insert(1, serde_tag);
        }
    }
}

struct EventsDecorations;
impl DecorationStrategy for EventsDecorations {
    fn apply_to_struct(&self, item_struct: &mut syn::ItemStruct) {
        // Check if struct already has derive attributes
        if has_existing_derives(item_struct) {
            return; // Skip if already decorated
        }
        
        // Add standard derives for event models
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
        };
        item_struct.attrs.insert(0, derives);
        
        // Add EventValidation trait implementation for framework extraction
        let event_validation: syn::Attribute = syn::parse_quote! {
            #[automatically_derived]
        };
        item_struct.attrs.push(event_validation);
    }
    
    fn apply_to_enum(&self, item_enum: &mut syn::ItemEnum) {
        // Check if enum already has derive attributes
        if has_existing_derives_enum(item_enum) {
            return; // Skip if already decorated
        }
        
        let derives: syn::Attribute = syn::parse_quote! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
        };
        item_enum.attrs.insert(0, derives);
    }
}

// Helper function to check if a struct already has derive attributes
fn has_existing_derives(item_struct: &syn::ItemStruct) -> bool {
    item_struct.attrs.iter().any(|attr| {
        attr.path().is_ident("derive")
    })
}

// Helper function to check if an enum already has derive attributes
fn has_existing_derives_enum(item_enum: &syn::ItemEnum) -> bool {
    item_enum.attrs.iter().any(|attr| {
        attr.path().is_ident("derive")
    })
}

fn read_and_enhance_structs(file_path: &str, strategy: &dyn DecorationStrategy) -> Result<proc_macro2::TokenStream, Box<dyn std::error::Error>> {
    // Use CARGO_MANIFEST_DIR to resolve the path
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
    let full_path = std::path::Path::new(&manifest_dir).join(file_path);
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
