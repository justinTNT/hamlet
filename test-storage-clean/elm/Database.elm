module Database exposing (..)

-- Auto-generated Database module
-- Contains database table types with framework decorations
-- Generated from: src/models/db/

import Json.Decode
import Json.Encode
import Dict exposing (Dict)
import Set exposing (Set)

type alias MicroblogItem =
    { id : Generated
    , title : String
    , link : Maybe (String)
    , image : Maybe (String)
    , extract : Maybe (String)
    , ownerComment : DefaultValue
    , tags : List (String)
    , timestamp : Generated
    , viewCount : Int
    }



type alias ItemComment =
    { id : Generated
    , itemId : String
    , guestId : String
    , parentId : Maybe (String)
    , authorName : String
    , text : String
    , timestamp : Generated
    }



type alias Tag =
    { id : Generated
    , name : String
    }



type alias Guest =
    { id : Generated
    , name : String
    , picture : String
    , sessionId : String
    , createdAt : Generated
    }



microblogItemEncoder : MicroblogItem -> Json.Encode.Value

microblogItemEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "title", (Json.Encode.string) struct.title )
        , ( "link", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.link )
        , ( "image", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.image )
        , ( "extract", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.extract )
        , ( "owner_comment", (defaultValueEncoder) struct.ownerComment )
        , ( "tags", (Json.Encode.list (Json.Encode.string)) struct.tags )
        , ( "timestamp", (generatedEncoder) struct.timestamp )
        , ( "view_count", (Json.Encode.int) struct.viewCount )
        ]



itemCommentEncoder : ItemComment -> Json.Encode.Value

itemCommentEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "item_id", (Json.Encode.string) struct.itemId )
        , ( "guest_id", (Json.Encode.string) struct.guestId )
        , ( "parent_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.parentId )
        , ( "author_name", (Json.Encode.string) struct.authorName )
        , ( "text", (Json.Encode.string) struct.text )
        , ( "timestamp", (generatedEncoder) struct.timestamp )
        ]



tagEncoder : Tag -> Json.Encode.Value

tagEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "name", (Json.Encode.string) struct.name )
        ]



guestEncoder : Guest -> Json.Encode.Value

guestEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "name", (Json.Encode.string) struct.name )
        , ( "picture", (Json.Encode.string) struct.picture )
        , ( "session_id", (Json.Encode.string) struct.sessionId )
        , ( "created_at", (generatedEncoder) struct.createdAt )
        ]



microblogItemDecoder : Json.Decode.Decoder MicroblogItem

microblogItemDecoder =
    Json.Decode.succeed MicroblogItem
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "title" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "link" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "image" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "extract" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "owner_comment" (defaultValueDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "view_count" (Json.Decode.int)))



itemCommentDecoder : Json.Decode.Decoder ItemComment

itemCommentDecoder =
    Json.Decode.succeed ItemComment
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "parent_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "author_name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (generatedDecoder)))



tagDecoder : Json.Decode.Decoder Tag

tagDecoder =
    Json.Decode.succeed Tag
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))



guestDecoder : Json.Decode.Decoder Guest

guestDecoder =
    Json.Decode.succeed Guest
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "picture" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "session_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "created_at" (generatedDecoder)))




-- Database framework features:
-- ✅ Generated primary keys (Generated type)
-- ✅ Auto timestamps (Generated type)
-- ✅ Default values (DefaultValue type)
-- ✅ Foreign key relationships
-- ✅ JSON serialization for API responses

-- Database types discovered:
-- - MicroblogItem (blog posts with generated IDs)
-- - Guest (user sessions with generated IDs)
-- - Tag (taxonomy with generated IDs)
-- - ItemComment (threaded comments with generated IDs)