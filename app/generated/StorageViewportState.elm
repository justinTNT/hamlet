module Storage.ViewportState exposing 
    ( save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for ViewportState

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- PORTS

port saveViewportState : ViewportState -> Cmd msg
port loadViewportState : () -> Cmd msg
port clearViewportState : () -> Cmd msg  
port viewportstateLoaded : (Maybe ViewportState -> msg) -> Sub msg
port viewportstateChanged : (Maybe ViewportState -> msg) -> Sub msg


-- API

{-| Save ViewportState to localStorage
-}
save : ViewportState -> Cmd msg
save viewportstate = saveViewportState viewportstate

{-| Load ViewportState from localStorage  
-}
load : Cmd msg
load = loadViewportState ()

{-| Clear ViewportState from localStorage
-}
clear : Cmd msg
clear = clearViewportState ()

{-| Check if ViewportState exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored ViewportState
Note: You'll need to load, modify, then save
-}
update : (ViewportState -> ViewportState) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to ViewportState load results
-}
onLoad : (Maybe ViewportState -> msg) -> Sub msg
onLoad toMsg = viewportstateLoaded toMsg

{-| Subscribe to ViewportState changes
-}
onChange : (Maybe ViewportState -> msg) -> Sub msg
onChange toMsg = viewportstateChanged toMsg