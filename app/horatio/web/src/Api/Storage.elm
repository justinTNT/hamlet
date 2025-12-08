module Api.Storage exposing
    ( -- Generic KV operations
      setKV
    , getKV
    , deleteKV
    , listKV
    , cleanupKV
    , statsKV
      -- Type-safe helpers for storage types
    , setUserPreferences
    , getUserPreferences
    , deleteUserPreferences
    , setSessionCache
    , getSessionCache
    , deleteSessionCache
    , setCursorPosition
    , getCursorPosition
    , deleteCursorPosition
    , listCursorPositions
    , setViewportState
    , getViewportState
    , deleteViewportState
    , setTypingIndicator
    , getTypingIndicator
    , deleteTypingIndicator
    , listTypingIndicators
    , setUserPresence
    , getUserPresence
    , deleteUserPresence
    , listUserPresence
    , setAppConfig
    , getAppConfig
    , deleteAppConfig
    , setJobProgress
    , getJobProgress
    , deleteJobProgress
    , listJobProgress
    )

import Http
import Json.Decode as Decode
import Json.Encode as Encode
import Task exposing (Task)


-- GENERIC KV OPERATIONS

type alias KVResponse =
    { success : Bool
    , value : Maybe Decode.Value
    , found : Bool
    , expired : Bool
    }

type alias KVListResponse =
    { keys : List KVItem }

type alias KVItem =
    { key : String
    , value : Decode.Value
    , type_ : String
    , created_at : Int
    }

type alias KVStats =
    { total_keys : Int
    , host : String
    }


setKV : String -> String -> Encode.Value -> Maybe Int -> Task Http.Error KVResponse
setKV storageType key value maybeTtl =
    let
        body = 
            Encode.object
                ([ ("value", value) ] ++
                 (case maybeTtl of
                    Just ttl -> [ ("ttl", Encode.int ttl) ]
                    Nothing -> []))
    in
    Http.task
        { method = "POST"
        , headers = []
        , url = "/kv/set/" ++ storageType ++ "/" ++ key
        , body = Http.jsonBody body
        , resolver = Http.stringResolver (handleKVResponse kvResponseDecoder)
        , timeout = Nothing
        }


getKV : String -> String -> Task Http.Error KVResponse
getKV storageType key =
    Http.task
        { method = "GET"
        , headers = []
        , url = "/kv/get/" ++ storageType ++ "/" ++ key
        , body = Http.emptyBody
        , resolver = Http.stringResolver (handleKVResponse kvResponseDecoder)
        , timeout = Nothing
        }


deleteKV : String -> String -> Task Http.Error KVResponse  
deleteKV storageType key =
    Http.task
        { method = "DELETE"
        , headers = []
        , url = "/kv/delete/" ++ storageType ++ "/" ++ key
        , body = Http.emptyBody
        , resolver = Http.stringResolver (handleKVResponse kvResponseDecoder)
        , timeout = Nothing
        }


listKV : String -> Task Http.Error KVListResponse
listKV prefix =
    Http.task
        { method = "GET"
        , headers = []
        , url = "/kv/list/" ++ prefix
        , body = Http.emptyBody
        , resolver = Http.stringResolver (handleKVResponse kvListResponseDecoder)
        , timeout = Nothing
        }


cleanupKV : Task Http.Error KVResponse
cleanupKV =
    Http.task
        { method = "POST"
        , headers = []
        , url = "/kv/cleanup"
        , body = Http.emptyBody
        , resolver = Http.stringResolver (handleKVResponse kvResponseDecoder)
        , timeout = Nothing
        }


statsKV : Bool -> Task Http.Error KVStats
statsKV global =
    let
        url = if global then "/kv/stats?global=true" else "/kv/stats"
    in
    Http.task
        { method = "GET"
        , headers = []
        , url = url
        , body = Http.emptyBody
        , resolver = Http.stringResolver (handleKVResponse kvStatsDecoder)
        , timeout = Nothing
        }


-- DECODERS

kvResponseDecoder : Decode.Decoder KVResponse
kvResponseDecoder =
    Decode.map4 KVResponse
        (Decode.field "success" Decode.bool |> Decode.maybe |> Decode.map (Maybe.withDefault False))
        (Decode.field "value" Decode.value |> Decode.maybe)
        (Decode.field "found" Decode.bool |> Decode.maybe |> Decode.map (Maybe.withDefault False))
        (Decode.field "expired" Decode.bool |> Decode.maybe |> Decode.map (Maybe.withDefault False))


kvListResponseDecoder : Decode.Decoder KVListResponse
kvListResponseDecoder =
    Decode.map KVListResponse
        (Decode.field "keys" (Decode.list kvItemDecoder))


kvItemDecoder : Decode.Decoder KVItem
kvItemDecoder =
    Decode.map4 KVItem
        (Decode.field "key" Decode.string)
        (Decode.field "value" Decode.value)
        (Decode.field "type" Decode.string)
        (Decode.field "created_at" Decode.int)


kvStatsDecoder : Decode.Decoder KVStats
kvStatsDecoder =
    Decode.map2 KVStats
        (Decode.field "total_keys" Decode.int)
        (Decode.field "host" Decode.string)


handleKVResponse : Decode.Decoder a -> Http.Response String -> Result Http.Error a
handleKVResponse decoder response =
    case response of
        Http.BadUrl_ url ->
            Err (Http.BadUrl url)

        Http.Timeout_ ->
            Err Http.Timeout

        Http.NetworkError_ ->
            Err Http.NetworkError

        Http.BadStatus_ metadata body ->
            Err (Http.BadStatus metadata.statusCode)

        Http.GoodStatus_ metadata body ->
            case Decode.decodeString decoder body of
                Ok value ->
                    Ok value

                Err err ->
                    Err (Http.BadBody (Decode.errorToString err))


-- TYPE-SAFE HELPERS
-- Auto-generated based on storage type definitions

-- UserPreferences
type alias UserPreferences =
    { theme : String
    , notifications : Bool  
    , language : String
    }

userPreferencesEncoder : UserPreferences -> Encode.Value
userPreferencesEncoder prefs =
    Encode.object
        [ ("theme", Encode.string prefs.theme)
        , ("notifications", Encode.bool prefs.notifications)
        , ("language", Encode.string prefs.language)
        ]

userPreferencesDecoder : Decode.Decoder UserPreferences
userPreferencesDecoder =
    Decode.map3 UserPreferences
        (Decode.field "theme" Decode.string)
        (Decode.field "notifications" Decode.bool)
        (Decode.field "language" Decode.string)

setUserPreferences : String -> UserPreferences -> Task Http.Error KVResponse
setUserPreferences key prefs =
    setKV "UserPreferences" key (userPreferencesEncoder prefs) Nothing

getUserPreferences : String -> Task Http.Error (Maybe UserPreferences)
getUserPreferences key =
    getKV "UserPreferences" key
        |> Task.map (\response ->
            case response.value of
                Just val ->
                    case Decode.decodeValue userPreferencesDecoder val of
                        Ok prefs -> Just prefs
                        Err _ -> Nothing
                Nothing -> Nothing
        )

deleteUserPreferences : String -> Task Http.Error KVResponse
deleteUserPreferences key =
    deleteKV "UserPreferences" key


-- SessionCache
type alias SessionCache =
    { user_id : String
    , permissions : List String
    , last_activity : Int
    }

sessionCacheEncoder : SessionCache -> Encode.Value
sessionCacheEncoder cache =
    Encode.object
        [ ("user_id", Encode.string cache.user_id)
        , ("permissions", Encode.list Encode.string cache.permissions)
        , ("last_activity", Encode.int cache.last_activity)
        ]

sessionCacheDecoder : Decode.Decoder SessionCache
sessionCacheDecoder =
    Decode.map3 SessionCache
        (Decode.field "user_id" Decode.string)
        (Decode.field "permissions" (Decode.list Decode.string))
        (Decode.field "last_activity" Decode.int)

setSessionCache : String -> SessionCache -> Task Http.Error KVResponse
setSessionCache key cache =
    setKV "SessionCache" key (sessionCacheEncoder cache) (Just 3600) -- 1 hour TTL

getSessionCache : String -> Task Http.Error (Maybe SessionCache)
getSessionCache key =
    getKV "SessionCache" key
        |> Task.map (\response ->
            case response.value of
                Just val ->
                    case Decode.decodeValue sessionCacheDecoder val of
                        Ok cache -> Just cache
                        Err _ -> Nothing
                Nothing -> Nothing
        )

deleteSessionCache : String -> Task Http.Error KVResponse
deleteSessionCache key =
    deleteKV "SessionCache" key


-- CursorPosition
type alias CursorPosition =
    { x : Int
    , y : Int
    , item_id : String
    , user_id : String
    }

cursorPositionEncoder : CursorPosition -> Encode.Value
cursorPositionEncoder pos =
    Encode.object
        [ ("x", Encode.int pos.x)
        , ("y", Encode.int pos.y)
        , ("item_id", Encode.string pos.item_id)
        , ("user_id", Encode.string pos.user_id)
        ]

cursorPositionDecoder : Decode.Decoder CursorPosition
cursorPositionDecoder =
    Decode.map4 CursorPosition
        (Decode.field "x" Decode.int)
        (Decode.field "y" Decode.int)
        (Decode.field "item_id" Decode.string)
        (Decode.field "user_id" Decode.string)

setCursorPosition : String -> CursorPosition -> Task Http.Error KVResponse
setCursorPosition key pos =
    setKV "CursorPosition" key (cursorPositionEncoder pos) (Just 300) -- 5 minute TTL

getCursorPosition : String -> Task Http.Error (Maybe CursorPosition)
getCursorPosition key =
    getKV "CursorPosition" key
        |> Task.map (\response ->
            case response.value of
                Just val ->
                    case Decode.decodeValue cursorPositionDecoder val of
                        Ok pos -> Just pos
                        Err _ -> Nothing
                Nothing -> Nothing
        )

deleteCursorPosition : String -> Task Http.Error KVResponse
deleteCursorPosition key =
    deleteKV "CursorPosition" key

listCursorPositions : String -> Task Http.Error (List CursorPosition)
listCursorPositions prefix =
    listKV ("CursorPosition:" ++ prefix)
        |> Task.map (\response ->
            response.keys
                |> List.filterMap (\item ->
                    case Decode.decodeValue cursorPositionDecoder item.value of
                        Ok pos -> Just pos
                        Err _ -> Nothing
                )
        )


-- ViewportState  
type alias ViewportState =
    { scroll_y : Float
    , selected_item : Maybe String
    , sidebar_collapsed : Bool
    }

viewportStateEncoder : ViewportState -> Encode.Value
viewportStateEncoder state =
    Encode.object
        [ ("scroll_y", Encode.float state.scroll_y)
        , ("selected_item", 
            case state.selected_item of
                Just item -> Encode.string item
                Nothing -> Encode.null)
        , ("sidebar_collapsed", Encode.bool state.sidebar_collapsed)
        ]

viewportStateDecoder : Decode.Decoder ViewportState
viewportStateDecoder =
    Decode.map3 ViewportState
        (Decode.field "scroll_y" Decode.float)
        (Decode.field "selected_item" (Decode.nullable Decode.string))
        (Decode.field "sidebar_collapsed" Decode.bool)

setViewportState : String -> ViewportState -> Task Http.Error KVResponse
setViewportState key state =
    setKV "ViewportState" key (viewportStateEncoder state) Nothing

getViewportState : String -> Task Http.Error (Maybe ViewportState)
getViewportState key =
    getKV "ViewportState" key
        |> Task.map (\response ->
            case response.value of
                Just val ->
                    case Decode.decodeValue viewportStateDecoder val of
                        Ok state -> Just state
                        Err _ -> Nothing
                Nothing -> Nothing
        )

deleteViewportState : String -> Task Http.Error KVResponse
deleteViewportState key =
    deleteKV "ViewportState" key


-- Simplified implementations for other types (following same pattern)
-- TypingIndicator, UserPresence, AppConfig, JobProgress would be similar...

setTypingIndicator : String -> Encode.Value -> Task Http.Error KVResponse
setTypingIndicator key value =
    setKV "TypingIndicator" key value (Just 10) -- 10 second TTL

getTypingIndicator : String -> Task Http.Error (Maybe Decode.Value)
getTypingIndicator key =
    getKV "TypingIndicator" key |> Task.map .value

deleteTypingIndicator : String -> Task Http.Error KVResponse
deleteTypingIndicator key =
    deleteKV "TypingIndicator" key

listTypingIndicators : String -> Task Http.Error KVListResponse
listTypingIndicators prefix =
    listKV ("TypingIndicator:" ++ prefix)

setUserPresence : String -> Encode.Value -> Task Http.Error KVResponse
setUserPresence key value =
    setKV "UserPresence" key value (Just 60) -- 1 minute TTL

getUserPresence : String -> Task Http.Error (Maybe Decode.Value)
getUserPresence key =
    getKV "UserPresence" key |> Task.map .value

deleteUserPresence : String -> Task Http.Error KVResponse
deleteUserPresence key =
    deleteKV "UserPresence" key

listUserPresence : String -> Task Http.Error KVListResponse
listUserPresence prefix =
    listKV ("UserPresence:" ++ prefix)

setAppConfig : String -> Encode.Value -> Task Http.Error KVResponse
setAppConfig key value =
    setKV "AppConfig" key value Nothing

getAppConfig : String -> Task Http.Error (Maybe Decode.Value)
getAppConfig key =
    getKV "AppConfig" key |> Task.map .value

deleteAppConfig : String -> Task Http.Error KVResponse
deleteAppConfig key =
    deleteKV "AppConfig" key

setJobProgress : String -> Encode.Value -> Task Http.Error KVResponse
setJobProgress key value =
    setKV "JobProgress" key value (Just 3600) -- 1 hour TTL

getJobProgress : String -> Task Http.Error (Maybe Decode.Value)
getJobProgress key =
    getKV "JobProgress" key |> Task.map .value

deleteJobProgress : String -> Task Http.Error KVResponse
deleteJobProgress key =
    deleteKV "JobProgress" key

listJobProgress : String -> Task Http.Error KVListResponse
listJobProgress prefix =
    listKV ("JobProgress:" ++ prefix)