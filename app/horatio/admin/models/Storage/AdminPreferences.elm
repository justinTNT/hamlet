module Storage.AdminPreferences exposing (..)

{-| Admin UI Preferences

    Browser localStorage model for admin UI state.
-}


type alias AdminPreferences =
    { columnWidthsJson : String
    }
