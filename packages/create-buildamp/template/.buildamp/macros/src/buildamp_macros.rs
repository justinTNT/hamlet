use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, parse::{Parse, ParseStream}, Token, LitStr, Ident};

// Auto-apply derives for different model types
pub fn buildamp_db(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
        #input
    };
    TokenStream::from(expanded)
}

pub fn buildamp_events(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        #input
    };
    TokenStream::from(expanded)
}

pub fn buildamp_storage(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
        #input
    };
    TokenStream::from(expanded)
}

pub fn buildamp_sse(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        #input
    };
    TokenStream::from(expanded)
}

pub fn buildamp_context_data(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm, crate::BuildAmpContext)]
        #input
    };
    TokenStream::from(expanded)
}

// Auto-apply SSE decorations to all items in SSE files
pub fn buildamp_sse_module(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // Parse the module content and apply SSE decorations to all structs/enums
    let input = parse_macro_input!(item as syn::ItemMod);
    
    if let Some((_, ref content)) = input.content {
        let mut enhanced_items = Vec::new();
        
        for item in content.clone() {
            match item {
                syn::Item::Struct(mut item_struct) => {
                    // Apply SSE derives to struct
                    let sse_derives: syn::Attribute = syn::parse_quote! {
                        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
                    };
                    item_struct.attrs.insert(0, sse_derives);
                    enhanced_items.push(syn::Item::Struct(item_struct));
                },
                syn::Item::Enum(mut item_enum) => {
                    // Apply SSE derives to enum
                    let sse_derives: syn::Attribute = syn::parse_quote! {
                        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
                    };
                    item_enum.attrs.insert(0, sse_derives);
                    
                    // Add serde tag for tagged union
                    let serde_tag: syn::Attribute = syn::parse_quote! {
                        #[serde(tag = "type", content = "data")]
                    };
                    item_enum.attrs.insert(1, serde_tag);
                    enhanced_items.push(syn::Item::Enum(item_enum));
                },
                _ => enhanced_items.push(item),
            }
        }
        
        let mut enhanced_module = input.clone();
        enhanced_module.content = Some((syn::token::Brace::default(), enhanced_items));
        
        let expanded = quote! {
            #enhanced_module
        };
        TokenStream::from(expanded)
    } else {
        // No content, just return as is
        let expanded = quote! { #input };
        TokenStream::from(expanded)
    }
}

// Auto-apply DB decorations to all items in DB files
pub fn buildamp_db_module(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as syn::ItemMod);
    
    if let Some((_, ref content)) = input.content {
        let mut enhanced_items = Vec::new();
        
        for item in content.clone() {
            match item {
                syn::Item::Struct(mut item_struct) => {
                    let db_derives: syn::Attribute = syn::parse_quote! {
                        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
                    };
                    item_struct.attrs.insert(0, db_derives);
                    enhanced_items.push(syn::Item::Struct(item_struct));
                },
                syn::Item::Enum(mut item_enum) => {
                    let db_derives: syn::Attribute = syn::parse_quote! {
                        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
                    };
                    item_enum.attrs.insert(0, db_derives);
                    enhanced_items.push(syn::Item::Enum(item_enum));
                },
                _ => enhanced_items.push(item),
            }
        }
        
        let mut enhanced_module = input.clone();
        enhanced_module.content = Some((syn::token::Brace::default(), enhanced_items));
        
        let expanded = quote! {
            #enhanced_module
        };
        TokenStream::from(expanded)
    } else {
        let expanded = quote! { #input };
        TokenStream::from(expanded)
    }
}

// Auto-apply storage decorations to all items in storage files
pub fn buildamp_storage_module(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as syn::ItemMod);
    
    if let Some((_, ref content)) = input.content {
        let mut enhanced_items = Vec::new();
        
        for item in content.clone() {
            match item {
                syn::Item::Struct(mut item_struct) => {
                    let storage_derives: syn::Attribute = syn::parse_quote! {
                        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
                    };
                    item_struct.attrs.insert(0, storage_derives);
                    enhanced_items.push(syn::Item::Struct(item_struct));
                },
                syn::Item::Enum(mut item_enum) => {
                    let storage_derives: syn::Attribute = syn::parse_quote! {
                        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
                    };
                    item_enum.attrs.insert(0, storage_derives);
                    enhanced_items.push(syn::Item::Enum(item_enum));
                },
                _ => enhanced_items.push(item),
            }
        }
        
        let mut enhanced_module = input.clone();
        enhanced_module.content = Some((syn::token::Brace::default(), enhanced_items));
        
        let expanded = quote! {
            #enhanced_module
        };
        TokenStream::from(expanded)
    } else {
        let expanded = quote! { #input };
        TokenStream::from(expanded)
    }
}

pub fn buildamp_domain(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm, crate::BuildAmpContext)]
        #input
    };
    TokenStream::from(expanded)
}

// Parse buildamp attribute arguments
struct BuildAmpArgs {
    path: Option<String>,
    bundle_with: Option<String>,
    server_context: Option<String>,
}

impl Parse for BuildAmpArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let mut path = None;
        let mut bundle_with = None;
        let mut server_context = None;
        
        while !input.is_empty() {
            let ident: Ident = input.parse()?;
            input.parse::<Token![=]>()?;
            let lit: LitStr = input.parse()?;
            
            match ident.to_string().as_str() {
                "path" => path = Some(lit.value()),
                "bundle_with" => bundle_with = Some(lit.value()),
                "server_context" => server_context = Some(lit.value()),
                _ => return Err(syn::Error::new(ident.span(), "Unknown attribute")),
            }
            
            // Parse optional comma
            if input.peek(Token![,]) {
                input.parse::<Token![,]>()?;
            }
        }
        
        Ok(BuildAmpArgs { path, bundle_with, server_context })
    }
}

pub fn buildamp(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut input = parse_macro_input!(item as DeriveInput);
    
    // Parse the attribute arguments
    let args = if attr.is_empty() {
        BuildAmpArgs { path: None, bundle_with: None, server_context: None }
    } else {
        parse_macro_input!(attr as BuildAmpArgs)
    };
    
    let path_value = args.path.unwrap_or_default();
    
    // Create the api attribute with parsed values
    let mut api_tokens = vec![];
    
    // Always add path
    api_tokens.push(quote! { path = #path_value });
    
    // Add optional parameters
    if let Some(bundle_with) = args.bundle_with {
        api_tokens.push(quote! { bundle_with = #bundle_with });
    }
    
    if let Some(server_context) = args.server_context {
        api_tokens.push(quote! { server_context = #server_context });
    }

    // Create the api attribute
    let api_attr: syn::Attribute = syn::parse_quote! {
        #[api(#(#api_tokens),*)]
    };
    
    // Add the api attribute to the struct
    input.attrs.push(api_attr);

    let expanded = quote! {
        #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpEndpoint, crate::BuildAmpElm)]
        #input
    };
    TokenStream::from(expanded)
}
