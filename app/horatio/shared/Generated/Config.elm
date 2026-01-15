module Generated.Config exposing
    ( GlobalConfig
    , FeatureFlags
    , globalConfigDecoder
    , encodeGlobalConfig
    )

{-| Generated configuration types for app initialization

These types match the Rust models in models/config/global_config.rs
They define the shape of configuration data passed to Elm via init flags.

-}

import Json.Decode as Decode
import Json.Encode as Encode


-- CONFIG TYPES


{-| GlobalConfig configuration type
-}
type alias GlobalConfig =
    { siteName : String
    , features : FeatureFlags
    }


{-| FeatureFlags configuration type
-}
type alias FeatureFlags =
    { comments : Bool
    , submissions : Bool
    , tags : Bool
    }


-- DECODERS


globalConfigDecoder : Decode.Decoder GlobalConfig
globalConfigDecoder =
    Decode.map2 GlobalConfig
        (Decode.field "siteName" Decode.string)
        (Decode.field "features" featureFlagsDecoder)


featureFlagsDecoder : Decode.Decoder FeatureFlags
featureFlagsDecoder =
    Decode.map3 FeatureFlags
        (Decode.field "comments" Decode.bool)
        (Decode.field "submissions" Decode.bool)
        (Decode.field "tags" Decode.bool)


-- ENCODERS


encodeGlobalConfig : GlobalConfig -> Encode.Value
encodeGlobalConfig config =
    Encode.object
        [ ( "siteName", Encode.string config.siteName )
        , ( "features", encodeFeatureFlags config.features )
        ]


encodeFeatureFlags : FeatureFlags -> Encode.Value
encodeFeatureFlags features =
    Encode.object
        [ ( "comments", Encode.bool features.comments )
        , ( "submissions", Encode.bool features.submissions )
        , ( "tags", Encode.bool features.tags )
        ]
