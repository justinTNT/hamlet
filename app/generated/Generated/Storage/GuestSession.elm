port module Generated.Storage.GuestSession exposing 
    ( GuestSession, save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for GuestSession

# Types
@docs GuestSession

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- TYPES

{-| GuestSession type for storage operations
-}
type alias GuestSession =
    { guest_id : String
    , display_name : String
    , created_at : Int
    }


-- PORTS

port saveGuestSession : GuestSession -> Cmd msg
port loadGuestSession : () -> Cmd msg
port clearGuestSession : () -> Cmd msg  
port guestsessionLoaded : (Maybe GuestSession -> msg) -> Sub msg
port guestsessionChanged : (Maybe GuestSession -> msg) -> Sub msg


-- API

{-| Save GuestSession to localStorage
-}
save : GuestSession -> Cmd msg
save guestsession = saveGuestSession guestsession

{-| Load GuestSession from localStorage  
-}
load : Cmd msg
load = loadGuestSession ()

{-| Clear GuestSession from localStorage
-}
clear : Cmd msg
clear = clearGuestSession ()

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
onLoad toMsg = guestsessionLoaded toMsg

{-| Subscribe to GuestSession changes
-}
onChange : (Maybe GuestSession -> msg) -> Sub msg
onChange toMsg = guestsessionChanged toMsg