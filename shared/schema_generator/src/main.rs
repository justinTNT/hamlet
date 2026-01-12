use elm_rs::{Elm, ElmEncode, ElmDecode};
use proto_rust::models::api::feed::*;
use proto_rust::models::api::comment::*;
use proto_rust::models::api::tags::*;
use proto_rust::models::api::item::*;
use std::io::Write;

fn main() {
    // 1. Generate Schema.elm (Types, Encoders, Decoders)
    let mut target = vec![];
    elm_rs::export!("Api.Schema", &mut target, {
        encoders: [
            // Feed types
            MicroblogItem,
            FeedItem,
            GetFeedRes,
            SubmitItemRes,
            
            // Comment types
            ItemComment,
            SubmitCommentRes,
            
            // Tag types
            GetTagsRes,
            
            // Item types
            GetItemRes,
        ],
        decoders: [
            // Feed types
            MicroblogItem,
            FeedItem,
            GetFeedRes,
            SubmitItemRes,
            
            // Comment types
            ItemComment,
            SubmitCommentRes,
            
            // Tag types
            GetTagsRes,
            
            // Item types
            GetItemRes,
        ],
    })
    .unwrap();

    let schema_content = String::from_utf8(target).unwrap();
    let mut file = std::fs::File::create("../../app/horatio/server/src/Api/Backend.elm").unwrap();
    file.write_all(schema_content.as_bytes()).unwrap();
    println!("Successfully generated app/horatio/server/src/Api/Backend.elm");
}

fn generate_api_module() -> String {
    r#"module Api exposing (..)

import Api.Schema exposing (..)
import Json.Decode as Decode
import Json.Encode as Encode

-- CORE TYPES

type alias Request response =
    { endpoint : String
    , body : Encode.Value
    , decoder : Decode.Decoder response
    }

-- ENDPOINTS

getFeed : GetFeedReq -> Request GetFeedRes
getFeed req =
    { endpoint = "GetFeed"
    , body = getFeedReqEncoder req
    , decoder = getFeedResDecoder
    }

submitItem : SubmitItemReq -> Request SubmitItemRes
submitItem req =
    { endpoint = "SubmitItem"
    , body = submitItemReqEncoder req
    , decoder = submitItemResDecoder
    }

submitComment : SubmitCommentReq -> Request SubmitCommentRes
submitComment req =
    { endpoint = "SubmitComment"
    , body = submitCommentReqEncoder req
    , decoder = submitCommentResDecoder
    }
"#.to_string()
}