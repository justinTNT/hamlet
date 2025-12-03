use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

pub fn buildamp_domain(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm, crate::BuildAmpContext)]
        #input
    };
    TokenStream::from(expanded)
}

pub fn buildamp_api(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let expanded = quote! {
        #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpEndpoint, crate::BuildAmpElm)]
        #input
    };
    TokenStream::from(expanded)
}
