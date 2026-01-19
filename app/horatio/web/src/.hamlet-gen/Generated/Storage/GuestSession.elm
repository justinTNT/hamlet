module Generated.Storage.GuestSession exposing 
    ( GuestSession, save, load, clear, exists, update
    , onLoad, onChange
    , encodeGuestSession, decodeGuestSession
    )

{-| Auto-generated storage helpers for GuestSession

# Types
@docs GuestSession

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

# JSON Helpers
@docs encodeGuestSession, decodeGuestSession

-}

import Json.Decode
import Json.Encode
import StoragePorts


-- TYPES

{-| GuestSession type for storage operations
-}
type alias GuestSession =
    { guestId : String
    , displayName : String
    , createdAt : Int
    }


-- JSON ENCODING/DECODING

{-| Encode GuestSession to JSON
-}
encodeGuestSession : GuestSession -> Json.Encode.Value
encodeGuestSession guestsession =
    Json.Encode.object
        [         ("guest_id", Json.Encode.string guestsession.guestId)
        ,         ("display_name", Json.Encode.string guestsession.displayName)
        ,         ("created_at", Json.Encode.int guestsession.createdAt)
        ]

{-| Decode GuestSession from JSON
-}
decodeGuestSession : Json.Decode.Decoder GuestSession
decodeGuestSession =
    Json.Decode.map3 GuestSession
        (Json.Decode.field "guest_id" Json.Decode.string)
        (Json.Decode.field "display_name" Json.Decode.string)
        (Json.Decode.field "created_at" Json.Decode.int)


-- API

{-| Save GuestSession to localStorage
-}
save : GuestSession -> Cmd msg
save guestsession = 
    StoragePorts.saveGuestSession (encodeGuestSession guestsession)

{-| Load GuestSession from localStorage  
-}
load : Cmd msg
load = 
    StoragePorts.loadGuestSession ()

{-| Clear GuestSession from localStorage
-}
clear : Cmd msg
clear = 
    StoragePorts.clearGuestSession ()

{-| Check if GuestSession exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored GuestSession
Note: You'll need to load, modify, then save
-}
update : (GuestSession -> GuestSession) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to GuestSession load results
-}
onLoad : (Maybe GuestSession -> msg) -> Sub msg
onLoad toMsg = 
    StoragePorts.guestsessionLoaded (\value ->
        case Json.Decode.decodeValue (Json.Decode.nullable decodeGuestSession) value of
            Ok maybeData -> toMsg maybeData
            Err _ -> toMsg Nothing
    )

{-| Subscribe to GuestSession changes
-}
onChange : (Maybe GuestSession -> msg) -> Sub msg
onChange toMsg = 
    StoragePorts.guestsessionChanged (\value ->
        case Json.Decode.decodeValue (Json.Decode.nullable decodeGuestSession) value of
            Ok maybeData -> toMsg maybeData
            Err _ -> toMsg Nothing
    )