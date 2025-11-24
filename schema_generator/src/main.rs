use elm_rs::{Elm, ElmEncode, ElmDecode};
use proto_rust::*;
use std::io::Write;

fn main() {
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

    let content = String::from_utf8(target).unwrap();

    let mut file = std::fs::File::create("../frontend/src/Api/Schema.elm").unwrap();
    file.write_all(content.as_bytes()).unwrap();

    println!("Successfully generated frontend/src/Api/Schema.elm");
}