module BuildAmp.Config exposing (..)

{-| Generated configuration types for app initialization

These types are generated from Elm models in shared/Config/*.elm
They define the shape of configuration data passed to Elm via init flags.

@docs AdminHooks, AdminHook, Cron, CronEvent, GlobalConfig, FeatureFlags

-}

import Json.Decode as Decode
import Json.Encode as Encode


-- CONFIG TYPES

{-| AdminHooks configuration type
Generated from AdminHooks.elm
-}
type alias AdminHooks =
    {     table : String
    , field : String
    , event : String
    }


{-| AdminHook configuration type
Generated from AdminHooks.elm
-}
type alias AdminHook =
    {     table : String
    , field : String
    , event : String
    }


{-| Cron configuration type
Generated from Cron.elm
-}
type alias Cron =
    {     event : String
    , schedule : String
    }


{-| CronEvent configuration type
Generated from Cron.elm
-}
type alias CronEvent =
    {     event : String
    , schedule : String
    }


{-| GlobalConfig configuration type
Generated from GlobalConfig.elm
-}
type alias GlobalConfig =
    {     siteName : String
    , features : FeatureFlags
    }


{-| FeatureFlags configuration type
Generated from GlobalConfig.elm
-}
type alias FeatureFlags =
    {     comments : Bool
    , submissions : Bool
    , tags : Bool
    }


-- DECODERS

adminHooksDecoder : Decode.Decoder AdminHooks
adminHooksDecoder =
    Decode.succeed AdminHooks
        |> andMap (Decode.field "table" Decode.string)
        |> andMap (Decode.field "field" Decode.string)
        |> andMap (Decode.field "event" Decode.string)


adminHookDecoder : Decode.Decoder AdminHook
adminHookDecoder =
    Decode.succeed AdminHook
        |> andMap (Decode.field "table" Decode.string)
        |> andMap (Decode.field "field" Decode.string)
        |> andMap (Decode.field "event" Decode.string)


cronDecoder : Decode.Decoder Cron
cronDecoder =
    Decode.succeed Cron
        |> andMap (Decode.field "event" Decode.string)
        |> andMap (Decode.field "schedule" Decode.string)


cronEventDecoder : Decode.Decoder CronEvent
cronEventDecoder =
    Decode.succeed CronEvent
        |> andMap (Decode.field "event" Decode.string)
        |> andMap (Decode.field "schedule" Decode.string)


globalConfigDecoder : Decode.Decoder GlobalConfig
globalConfigDecoder =
    Decode.succeed GlobalConfig
        |> andMap (Decode.field "site_name" Decode.string)
        |> andMap (Decode.field "features" featureFlagsDecoder)


featureFlagsDecoder : Decode.Decoder FeatureFlags
featureFlagsDecoder =
    Decode.succeed FeatureFlags
        |> andMap (Decode.field "comments" Decode.bool)
        |> andMap (Decode.field "submissions" Decode.bool)
        |> andMap (Decode.field "tags" Decode.bool)


-- ENCODERS

encodeAdminHooks : AdminHooks -> Encode.Value
encodeAdminHooks config =
    Encode.object
        [ ("table", Encode.string config.table)
        , ("field", Encode.string config.field)
        , ("event", Encode.string config.event)
        ]


encodeAdminHook : AdminHook -> Encode.Value
encodeAdminHook config =
    Encode.object
        [ ("table", Encode.string config.table)
        , ("field", Encode.string config.field)
        , ("event", Encode.string config.event)
        ]


encodeCron : Cron -> Encode.Value
encodeCron config =
    Encode.object
        [ ("event", Encode.string config.event)
        , ("schedule", Encode.string config.schedule)
        ]


encodeCronEvent : CronEvent -> Encode.Value
encodeCronEvent config =
    Encode.object
        [ ("event", Encode.string config.event)
        , ("schedule", Encode.string config.schedule)
        ]


encodeGlobalConfig : GlobalConfig -> Encode.Value
encodeGlobalConfig config =
    Encode.object
        [ ("site_name", Encode.string config.siteName)
        , ("features", encodeFeatureFlags config.features)
        ]


encodeFeatureFlags : FeatureFlags -> Encode.Value
encodeFeatureFlags config =
    Encode.object
        [ ("comments", Encode.bool config.comments)
        , ("submissions", Encode.bool config.submissions)
        , ("tags", Encode.bool config.tags)
        ]


-- HELPERS

encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value


-- Helper for pipeline-style decoding
andMap : Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
andMap = Decode.map2 (|>)
