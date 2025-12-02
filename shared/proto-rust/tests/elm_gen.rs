use proto_rust::{
    SubmitItemSlice, BackendAction, BackendEffect, BackendOutput, Tag, MicroblogItem, SubmitItemReq,
    ItemComment, SubmitCommentReq, SubmitCommentRes, GetFeedRes, GetTagsRes, GetTagsReq, GetFeedReq,
    ServerContext
};
use std::fs::File;
use std::io::Write;
use elm_rs::{Elm, ElmEncode, ElmDecode};

#[test]
fn generate_elm_types() {
    let path = "../../apps/server/src/Api/Backend.elm";
    let mut file = File::create(path).expect("Failed to create file");
    
    writeln!(file, "module Api.Backend exposing (..)").unwrap();
    writeln!(file, "").unwrap();
    writeln!(file, "import Json.Decode").unwrap();
    writeln!(file, "import Json.Encode").unwrap();
    writeln!(file, "import Dict exposing (Dict)").unwrap();
    writeln!(file, "import Set exposing (Set)").unwrap();
    writeln!(file, "").unwrap();
    
    // Write definitions manually
    
    let types = vec![
        <ServerContext as Elm>::elm_definition(),
        <Tag as Elm>::elm_definition(),
        <MicroblogItem as Elm>::elm_definition(),
        <SubmitItemReq as Elm>::elm_definition(),
        <SubmitItemSlice as Elm>::elm_definition(),
        <BackendAction as Elm>::elm_definition(),
        <BackendEffect as Elm>::elm_definition(),
        <BackendOutput as Elm>::elm_definition(),
        <ItemComment as Elm>::elm_definition(),
        <SubmitCommentReq as Elm>::elm_definition(),
        <SubmitCommentRes as Elm>::elm_definition(),
        <GetFeedRes as Elm>::elm_definition(),
        <GetTagsRes as Elm>::elm_definition(),
        <GetTagsReq as Elm>::elm_definition(),
        <GetFeedReq as Elm>::elm_definition(),
    ];
    
    for def in types {
        if let Some(d) = def {
            writeln!(file, "{}", d).unwrap();
            writeln!(file, "").unwrap();
        }
    }
    
    // Generate Encoders
    let encoders = vec![
        <ServerContext as ElmEncode>::encoder_definition(),
        <Tag as ElmEncode>::encoder_definition(),
        <MicroblogItem as ElmEncode>::encoder_definition(),
        <SubmitItemReq as ElmEncode>::encoder_definition(),
        <SubmitItemSlice as ElmEncode>::encoder_definition(),
        <BackendAction as ElmEncode>::encoder_definition(),
        <BackendEffect as ElmEncode>::encoder_definition(),
        <BackendOutput as ElmEncode>::encoder_definition(),
        <ItemComment as ElmEncode>::encoder_definition(),
        <SubmitCommentReq as ElmEncode>::encoder_definition(),
        <SubmitCommentRes as ElmEncode>::encoder_definition(),
        <GetFeedRes as ElmEncode>::encoder_definition(),
        <GetTagsRes as ElmEncode>::encoder_definition(),
        <GetTagsReq as ElmEncode>::encoder_definition(),
        <GetFeedReq as ElmEncode>::encoder_definition(),
    ];
    
    for enc in encoders {
        if let Some(e) = enc {
            writeln!(file, "{}", e).unwrap();
            writeln!(file, "").unwrap();
        }
    }

    // Generate Decoders
    let decoders = vec![
        <ServerContext as ElmDecode>::decoder_definition(),
        <Tag as ElmDecode>::decoder_definition(),
        <MicroblogItem as ElmDecode>::decoder_definition(),
        <SubmitItemReq as ElmDecode>::decoder_definition(),
        <SubmitItemSlice as ElmDecode>::decoder_definition(),
        <BackendAction as ElmDecode>::decoder_definition(),
        <BackendEffect as ElmDecode>::decoder_definition(),
        <BackendOutput as ElmDecode>::decoder_definition(),
        <ItemComment as ElmDecode>::decoder_definition(),
        <SubmitCommentReq as ElmDecode>::decoder_definition(),
        <SubmitCommentRes as ElmDecode>::decoder_definition(),
        <GetFeedRes as ElmDecode>::decoder_definition(),
        <GetTagsRes as ElmDecode>::decoder_definition(),
        <GetTagsReq as ElmDecode>::decoder_definition(),
        <GetFeedReq as ElmDecode>::decoder_definition(),
    ];

    for dec in decoders {
        if let Some(d) = dec {
            writeln!(file, "{}", d).unwrap();
            writeln!(file, "").unwrap();
        }
    }
}
