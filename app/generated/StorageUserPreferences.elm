module Storage.UserPreferences exposing 
    ( save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for UserPreferences

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- PORTS

port saveUserPreferences : UserPreferences -> Cmd msg
port loadUserPreferences : () -> Cmd msg
port clearUserPreferences : () -> Cmd msg  
port userpreferencesLoaded : (Maybe UserPreferences -> msg) -> Sub msg
port userpreferencesChanged : (Maybe UserPreferences -> msg) -> Sub msg


-- API

{-| Save UserPreferences to localStorage
-}
save : UserPreferences -> Cmd msg
save userpreferences = saveUserPreferences userpreferences

{-| Load UserPreferences from localStorage  
-}
load : Cmd msg
load = loadUserPreferences ()

{-| Clear UserPreferences from localStorage
-}
clear : Cmd msg
clear = clearUserPreferences ()

{-| Check if UserPreferences exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored UserPreferences
Note: You'll need to load, modify, then save
-}
update : (UserPreferences -> UserPreferences) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to UserPreferences load results
-}
onLoad : (Maybe UserPreferences -> msg) -> Sub msg
onLoad toMsg = userpreferencesLoaded toMsg

{-| Subscribe to UserPreferences changes
-}
onChange : (Maybe UserPreferences -> msg) -> Sub msg
onChange toMsg = userpreferencesChanged toMsg