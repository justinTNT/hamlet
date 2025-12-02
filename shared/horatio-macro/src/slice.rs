use quote::quote;
use syn::Ident;

pub fn generate_bundle_struct(
    struct_name: &Ident,
    data_type: Option<String>,
) -> proc_macro2::TokenStream {
    let bundle_name = Ident::new(&format!("{}Bundle", struct_name), struct_name.span());
    let data_field = if let Some(data) = data_type {
        let data_ident = Ident::new(&data, struct_name.span());
        quote! {
            #[serde(flatten)]
            pub data: #data_ident,
        }
    } else {
        quote! {}
    };

    quote! {
        #[derive(serde::Serialize, serde::Deserialize, Debug, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode)]
        pub struct #bundle_name {
            pub context: crate::ServerContext,
            // pub input: #struct_name,
            // #data_field
        }
    }
}
