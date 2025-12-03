module ManualExample exposing (..)

{-| This module shows what the horatio reader would look like WITHOUT BuildAmp.
Compare this manual JSON handling with the generated Api.Schema module.
-}

import Json.Decode as Decode
import Json.Encode as Encode

-- MANUAL APPROACH: All this boilerplate is eliminated by BuildAmp

type alias MicroblogItemManual =
    { id : String
    , title : String
    , link : Maybe String
    , image : Maybe String
    , extract : Maybe String
    , owner_comment : String
    , tags : List String
    , comments : List CommentManual  -- Nested types make this exponentially worse
    , timestamp : Int
    }

type alias CommentManual =
    { id : String
    , content : String
    , author : String
    , timestamp : Int
    }

-- MANUAL JSON DECODERS: Verbose and error-prone
microblogItemDecoder : Decode.Decoder MicroblogItemManual
microblogItemDecoder =
    Decode.map8 MicroblogItemManual
        (Decode.field "id" Decode.string)
        (Decode.field "title" Decode.string)  
        (Decode.maybe (Decode.field "link" Decode.string))
        (Decode.maybe (Decode.field "image" Decode.string))
        (Decode.maybe (Decode.field "extract" Decode.string))
        (Decode.field "owner_comment" Decode.string)
        (Decode.field "tags" (Decode.list Decode.string))
        (Decode.field "comments" (Decode.list commentDecoder))
        (Decode.field "timestamp" Decode.int)

commentDecoder : Decode.Decoder CommentManual
commentDecoder =
    Decode.map4 CommentManual
        (Decode.field "id" Decode.string)
        (Decode.field "content" Decode.string)
        (Decode.field "author" Decode.string)
        (Decode.field "timestamp" Decode.int)

-- MANUAL JSON ENCODERS: More boilerplate
encodeMicroblogItem : MicroblogItemManual -> Encode.Value
encodeMicroblogItem item =
    Encode.object
        [ ("id", Encode.string item.id)
        , ("title", Encode.string item.title)
        , ("link", encodeMaybe Encode.string item.link)
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", encodeMaybe Encode.string item.extract)
        , ("owner_comment", Encode.string item.owner_comment)
        , ("tags", Encode.list Encode.string item.tags)
        , ("comments", Encode.list encodeComment item.comments)
        , ("timestamp", Encode.int item.timestamp)
        ]

encodeComment : CommentManual -> Encode.Value
encodeComment comment =
    Encode.object
        [ ("id", Encode.string comment.id)
        , ("content", Encode.string comment.content) 
        , ("author", Encode.string comment.author)
        , ("timestamp", Encode.int comment.timestamp)
        ]

encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybe =
    case maybe of
        Just value -> encoder value
        Nothing -> Encode.null

{-| PROBLEMS WITH MANUAL APPROACH:

1. BOILERPLATE: ~50 lines of repetitive decoder/encoder code
2. ERROR-PRONE: Easy to misspell field names or use wrong types  
3. MAINTENANCE: When backend changes, manually update all decoders
4. NO COMPILE-TIME SAFETY: Runtime JSON errors instead of compile errors
5. DUPLICATION: Type definitions duplicated between Rust and Elm

BUILDAMP SOLUTION:
- Zero boilerplate: Api.Schema generated automatically
- Type safety: Compile-time errors if types mismatch
- Single source: Change Rust type, Elm updates automatically  
- Maintained by framework: Never manually write JSON codecs again
-}