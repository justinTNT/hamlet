use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, parse::{Parse, ParseStream}, Token, LitStr, Ident};

pub fn buildamp_domain(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm, crate::BuildAmpContext)]
        #input
    };
    TokenStream::from(expanded)
}

// Parse buildamp_api attribute arguments
struct BuildAmpApiArgs {
    path: Option<String>,
    bundle_with: Option<String>,
    server_context: Option<String>,
}

impl Parse for BuildAmpApiArgs {
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
        
        Ok(BuildAmpApiArgs { path, bundle_with, server_context })
    }
}

pub fn buildamp_api(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut input = parse_macro_input!(item as DeriveInput);
    
    // Parse the attribute arguments
    let args = if attr.is_empty() {
        BuildAmpApiArgs { path: None, bundle_with: None, server_context: None }
    } else {
        parse_macro_input!(attr as BuildAmpApiArgs)
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
