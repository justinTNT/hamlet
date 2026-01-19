module Config.GlobalConfig exposing (..)

{-| GlobalConfig Configuration Model

    Global configuration for host-specific customization.
    This struct defines the configuration data that can be customized per-host.
    The configuration is embedded as inline JSON in each {hostname}.html file
    and passed to Elm as init flags via window.GLOBAL_CONFIG.
-}


type alias GlobalConfig =
    { siteName : String
    , features : FeatureFlags
    }


type alias FeatureFlags =
    { comments : Bool
    , submissions : Bool
    , tags : Bool
    }
