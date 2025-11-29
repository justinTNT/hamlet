use elm_rs::{Elm, ElmEncode, ElmDecode};
use proto_rust::*;
use std::io::Write;

fn main() {
    // 1. Generate Schema.elm (Types, Encoders, Decoders)
    let mut target = vec![];
    elm_rs::export!("Api.Schema", &mut target, {
        encoders: [
            MicroblogItem,
            Guest,
            ItemComment,
            GetFeedReq,
            GetFeedRes,
            SubmitItemReq,
            SubmitItemRes,
            SubmitCommentReq,
            SubmitCommentRes,
            ApiError,
        ],
        decoders: [
            MicroblogItem,
            Guest,
            ItemComment,
            GetFeedReq,
            GetFeedRes,
            SubmitItemReq,
            SubmitItemRes,
            SubmitCommentReq,
            SubmitCommentRes,
            ApiError,
        ],
    })
    .unwrap();

    let schema_content = String::from_utf8(target).unwrap();
    let mut file = std::fs::File::create("../frontend/src/Api/Schema.elm").unwrap();
    file.write_all(schema_content.as_bytes()).unwrap();
    println!("Successfully generated frontend/src/Api/Schema.elm");

    // 2. Generate Api.elm (Request Objects)
    let api_content = generate_api_module();
    let mut api_file = std::fs::File::create("../frontend/src/Api.elm").unwrap();
    api_file.write_all(api_content.as_bytes()).unwrap();
    println!("Successfully generated frontend/src/Api.elm");
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