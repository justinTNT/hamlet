module Storage.FileProcessingStatus exposing 
    ( save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for FileProcessingStatus

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- PORTS

port saveFileProcessingStatus : FileProcessingStatus -> Cmd msg
port loadFileProcessingStatus : () -> Cmd msg
port clearFileProcessingStatus : () -> Cmd msg  
port fileprocessingstatusLoaded : (Maybe FileProcessingStatus -> msg) -> Sub msg
port fileprocessingstatusChanged : (Maybe FileProcessingStatus -> msg) -> Sub msg


-- API

{-| Save FileProcessingStatus to localStorage
-}
save : FileProcessingStatus -> Cmd msg
save fileprocessingstatus = saveFileProcessingStatus fileprocessingstatus

{-| Load FileProcessingStatus from localStorage  
-}
load : Cmd msg
load = loadFileProcessingStatus ()

{-| Clear FileProcessingStatus from localStorage
-}
clear : Cmd msg
clear = clearFileProcessingStatus ()

{-| Check if FileProcessingStatus exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored FileProcessingStatus
Note: You'll need to load, modify, then save
-}
update : (FileProcessingStatus -> FileProcessingStatus) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to FileProcessingStatus load results
-}
onLoad : (Maybe FileProcessingStatus -> msg) -> Sub msg
onLoad toMsg = fileprocessingstatusLoaded toMsg

{-| Subscribe to FileProcessingStatus changes
-}
onChange : (Maybe FileProcessingStatus -> msg) -> Sub msg
onChange toMsg = fileprocessingstatusChanged toMsg