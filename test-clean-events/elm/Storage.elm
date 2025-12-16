module Storage exposing (..)

-- Auto-generated Storage module
-- Contains browser storage types for client-side state
-- Generated from: src/models/storage/

import Json.Decode
import Json.Encode
import Dict exposing (Dict)
import Set exposing (Set)

type alias UserPreferences =
    { theme : String
    , notifications : Bool
    , locale : Locale
    }



type alias Locale =
    { language : String
    , timezone : String
    }



type alias FileProcessingStatus =
    { fileId : String
    , originalName : String
    , status : CrossTab
    , progressPercent : CrossTab
    , processingSteps : Cached
    }



type alias ProcessingStep =
    { stepName : String
    , status : String
    , startedAt : Maybe (Int)
    , completedAt : Maybe (Int)
    , errorMessage : Maybe (String)
    }



type alias ViewportState =
    { scrollY : SessionOnly
    , selectedItem : SessionOnly
    , sidebarCollapsed : CrossTab
    }



type alias AuthState =
    { userId : String
    , sessionToken : Expiring
    , permissions : Cached
    }



localeEncoder : Locale -> Json.Encode.Value

localeEncoder struct =
    Json.Encode.object
        [ ( "language", (Json.Encode.string) struct.language )
        , ( "timezone", (Json.Encode.string) struct.timezone )
        ]



        , ( "locale", (localeEncoder) struct.locale )
        ]



        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "locale" (localeDecoder)))



localeDecoder : Json.Decode.Decoder Locale

localeDecoder =
    Json.Decode.succeed Locale
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "language" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timezone" (Json.Decode.string)))


