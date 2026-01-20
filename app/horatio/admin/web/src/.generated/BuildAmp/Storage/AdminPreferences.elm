module BuildAmp.Storage.AdminPreferences exposing 
    ( AdminPreferences, save, load, clear, exists, update
    , onLoad, onChange
    , encodeAdminPreferences, decodeAdminPreferences
    )

{-| Auto-generated storage helpers for AdminPreferences

# Types
@docs AdminPreferences

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

# JSON Helpers
@docs encodeAdminPreferences, decodeAdminPreferences

-}

import Json.Decode
import Json.Encode
import StoragePorts


-- TYPES

{-| AdminPreferences type for storage operations
-}
type alias AdminPreferences =
    { columnWidthsJson : String
    }


-- JSON ENCODING/DECODING

{-| Encode AdminPreferences to JSON
-}
encodeAdminPreferences : AdminPreferences -> Json.Encode.Value
encodeAdminPreferences adminpreferences =
    Json.Encode.object
        [         ("column_widths_json", Json.Encode.string adminpreferences.columnWidthsJson)
        ]

{-| Decode AdminPreferences from JSON
-}
decodeAdminPreferences : Json.Decode.Decoder AdminPreferences
decodeAdminPreferences =
    Json.Decode.map AdminPreferences
        (Json.Decode.field "column_widths_json" Json.Decode.string)


-- API

{-| Save AdminPreferences to localStorage
-}
save : AdminPreferences -> Cmd msg
save adminpreferences = 
    StoragePorts.saveAdminPreferences (encodeAdminPreferences adminpreferences)

{-| Load AdminPreferences from localStorage  
-}
load : Cmd msg
load = 
    StoragePorts.loadAdminPreferences ()

{-| Clear AdminPreferences from localStorage
-}
clear : Cmd msg
clear = 
    StoragePorts.clearAdminPreferences ()

{-| Check if AdminPreferences exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored AdminPreferences
Note: You'll need to load, modify, then save
-}
update : (AdminPreferences -> AdminPreferences) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to AdminPreferences load results
-}
onLoad : (Maybe AdminPreferences -> msg) -> Sub msg
onLoad toMsg = 
    StoragePorts.adminpreferencesLoaded (\value ->
        case Json.Decode.decodeValue (Json.Decode.nullable decodeAdminPreferences) value of
            Ok maybeData -> toMsg maybeData
            Err _ -> toMsg Nothing
    )

{-| Subscribe to AdminPreferences changes
-}
onChange : (Maybe AdminPreferences -> msg) -> Sub msg
onChange toMsg = 
    StoragePorts.adminpreferencesChanged (\value ->
        case Json.Decode.decodeValue (Json.Decode.nullable decodeAdminPreferences) value of
            Ok maybeData -> toMsg maybeData
            Err _ -> toMsg Nothing
    )