module Storage.GuestSession exposing (..)

{-| GuestSession Storage Model

    Browser localStorage model for guest session tracking.
-}


type alias GuestSession =
    { guestId : String
    , displayName : String
    , createdAt : Int
    }
