module Storage exposing
    ( GuestSession
    , loadGuestSession, saveGuestSession, onGuestSessionLoaded
    )

{-| Clean Storage API for Elm developers

Generated from storage models in app/*/models/storage/
This provides a clean interface hiding BuildAmp.* implementation details.

# GuestSession
@docs GuestSession, loadGuestSession, saveGuestSession, onGuestSessionLoaded

-}

import BuildAmp.Storage.GuestSession as GuestSessionStorage


-- TYPES

{-| GuestSession type for storage operations
-}
type alias GuestSession = GuestSessionStorage.GuestSession


-- STORAGE FUNCTIONS

-- GUESTSESSION STORAGE

{-| Load GuestSession from localStorage
-}
loadGuestSession : () -> Cmd msg
loadGuestSession () =
    GuestSessionStorage.load

{-| Save GuestSession to localStorage  
-}
saveGuestSession : GuestSession -> Cmd msg
saveGuestSession guestsession =
    GuestSessionStorage.save guestsession

{-| Subscribe to GuestSession load results
-}
onGuestSessionLoaded : (Maybe GuestSession -> msg) -> Sub msg
onGuestSessionLoaded toMsg =
    GuestSessionStorage.onLoad toMsg
