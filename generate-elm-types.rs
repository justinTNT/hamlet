#!/usr/bin/env rust-script
//! ```cargo
//! [dependencies]
//! elm_rs = "0.2"
//! serde = { version = "1.0", features = ["derive"] }
//! serde_json = "1.0"
//! ```

use elm_rs::{Elm, ElmDecode, ElmEncode};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;

// Re-create the types we need with elm_rs derives
#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetItemReq {
    pub host: String,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetItemRes {
    pub item: MicroblogItem,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct MicroblogItem {
    pub id: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
    pub comments: Vec<ItemComment>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct ItemComment {
    pub id: String,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub timestamp: u64,
}

fn main() {
    let mut buffer = Vec::new();
    
    elm_rs::export!("Api.Backend", &mut buffer, {
        encoders: [GetItemReq, GetItemRes, MicroblogItem, ItemComment],
        decoders: [GetItemReq, GetItemRes, MicroblogItem, ItemComment],
    }).unwrap();
    
    let generated = String::from_utf8(buffer).unwrap();
    
    println!("Generated Elm types with full codecs:");
    println!("{}", generated);
}