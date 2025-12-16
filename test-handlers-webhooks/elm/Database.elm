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