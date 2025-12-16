module Storage.AuthState exposing 
    ( save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for AuthState

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- PORTS

port saveAuthState : AuthState -> Cmd msg
port loadAuthState : () -> Cmd msg
port clearAuthState : () -> Cmd msg  
port authstateLoaded : (Maybe AuthState -> msg) -> Sub msg
port authstateChanged : (Maybe AuthState -> msg) -> Sub msg


-- API

{-| Save AuthState to localStorage
-}
save : AuthState -> Cmd msg
save authstate = saveAuthState authstate

{-| Load AuthState from localStorage  
-}
load : Cmd msg
load = loadAuthState ()

{-| Clear AuthState from localStorage
-}
clear : Cmd msg
clear = clearAuthState ()

{-| Check if AuthState exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored AuthState
Note: You'll need to load, modify, then save
-}
update : (AuthState -> AuthState) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to AuthState load results
-}
onLoad : (Maybe AuthState -> msg) -> Sub msg
onLoad toMsg = authstateLoaded toMsg

{-| Subscribe to AuthState changes
-}
onChange : (Maybe AuthState -> msg) -> Sub msg
onChange toMsg = authstateChanged toMsg