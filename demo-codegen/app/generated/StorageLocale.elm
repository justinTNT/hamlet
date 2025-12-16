module Storage.Locale exposing 
    ( save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for Locale

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- PORTS

port saveLocale : Locale -> Cmd msg
port loadLocale : () -> Cmd msg
port clearLocale : () -> Cmd msg  
port localeLoaded : (Maybe Locale -> msg) -> Sub msg
port localeChanged : (Maybe Locale -> msg) -> Sub msg


-- API

{-| Save Locale to localStorage
-}
save : Locale -> Cmd msg
save locale = saveLocale locale

{-| Load Locale from localStorage  
-}
load : Cmd msg
load = loadLocale ()

{-| Clear Locale from localStorage
-}
clear : Cmd msg
clear = clearLocale ()

{-| Check if Locale exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored Locale
Note: You'll need to load, modify, then save
-}
update : (Locale -> Locale) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to Locale load results
-}
onLoad : (Maybe Locale -> msg) -> Sub msg
onLoad toMsg = localeLoaded toMsg

{-| Subscribe to Locale changes
-}
onChange : (Maybe Locale -> msg) -> Sub msg
onChange toMsg = localeChanged toMsg