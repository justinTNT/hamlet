use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields, Ident};
use syn::spanned::Spanned;

mod slice;
mod buildamp_macros;

#[proc_macro_attribute]
pub fn buildamp_domain(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_domain(attr, item)
}

#[proc_macro_attribute]
pub fn buildamp_api(attr: TokenStream, item: TokenStream) -> TokenStream {
    buildamp_macros::buildamp_api(attr, item)
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
                    let key = meta.path.get_ident().unwrap().to_string();
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
            #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, proto_rust::BuildAmpElm)]
            pub struct #bundle_name {
                pub context: proto_rust::ServerContext,
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
            pub fn validate(&mut self, _context: &proto_rust::Context) -> Result<(), String> {
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
            proto_rust::elm_export::EndpointDefinition {
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
            proto_rust::elm_export::ElmDefinition {
                name: stringify!(#name),
                get_def: <#name as elm_rs::Elm>::elm_definition,
            }
        }
        inventory::submit! {
            proto_rust::elm_export::ElmEncoder {
                name: stringify!(#name),
                get_enc: <#name as elm_rs::ElmEncode>::encoder_definition,
            }
        }
        inventory::submit! {
            proto_rust::elm_export::ElmDecoder {
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
                                        proto_rust::elm_export::ContextDefinition {
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
