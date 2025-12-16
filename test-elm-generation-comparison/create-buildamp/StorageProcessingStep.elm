module Storage.ProcessingStep exposing 
    ( save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for ProcessingStep

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- PORTS

port saveProcessingStep : ProcessingStep -> Cmd msg
port loadProcessingStep : () -> Cmd msg
port clearProcessingStep : () -> Cmd msg  
port processingstepLoaded : (Maybe ProcessingStep -> msg) -> Sub msg
port processingstepChanged : (Maybe ProcessingStep -> msg) -> Sub msg


-- API

{-| Save ProcessingStep to localStorage
-}
save : ProcessingStep -> Cmd msg
save processingstep = saveProcessingStep processingstep

{-| Load ProcessingStep from localStorage  
-}
load : Cmd msg
load = loadProcessingStep ()

{-| Clear ProcessingStep from localStorage
-}
clear : Cmd msg
clear = clearProcessingStep ()

{-| Check if ProcessingStep exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored ProcessingStep
Note: You'll need to load, modify, then save
-}
update : (ProcessingStep -> ProcessingStep) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to ProcessingStep load results
-}
onLoad : (Maybe ProcessingStep -> msg) -> Sub msg
onLoad toMsg = processingstepLoaded toMsg

{-| Subscribe to ProcessingStep changes
-}
onChange : (Maybe ProcessingStep -> msg) -> Sub msg
onChange toMsg = processingstepChanged toMsg