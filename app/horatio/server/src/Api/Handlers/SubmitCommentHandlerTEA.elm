port module Api.Handlers.SubmitCommentHandlerTEA exposing (main)

{-| SubmitComment Handler - TEA Architecture

This handler implements The Elm Architecture pattern for async request processing.
It demonstrates the req + state + stage pattern for complex async operations.

Business Logic:
Handles comment submission by creating new comment records in the database.

-}

import Api.Backend exposing (SubmitCommentRes, ItemComment)
import Generated.Database as DB
import Generated.Events as Events
import Generated.Services as Services
import Json.Encode as Encode
import Json.Decode as Decode
import Platform
import Task


-- MODEL (req + state + stage)

type alias Model =
    { stage : Stage
    , request : Maybe SubmitCommentReq
    , context : Maybe Context
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    -- TODO: Add domain-specific state fields here
    }


type Stage
    = Idle
    | Processing
    -- TODO: Add specific stages for your business logic, e.g.:
    -- | LoadingData
    -- | ValidatingInput  
    -- | SavingResults
    | Complete SubmitCommentRes
    | Failed String


type alias Context =
    { host : String
    , sessionId : Maybe String
    }


-- Local request type that matches JavaScript field names (snake_case)
type alias SubmitCommentReq =
    { host : String
    , item_id : String
    , parent_id : Maybe String
    , text : String
    , author_name : Maybe String
    }


type alias GlobalConfig = DB.GlobalConfig  -- Server-issued read-only config


type alias GlobalState = DB.GlobalState  -- Mutable handler state


-- UPDATE

type Msg
    = HandleRequest RequestBundle
    | ProcessingComplete SubmitCommentRes
    | CommentCreated DB.DbResponse


type alias RequestBundle =
    { id : String
    , context : Context
    , request : SubmitCommentReq
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , request = Nothing
      , context = Nothing
      , globalConfig = flags.globalConfig
      , globalState = flags.globalState
      }
    , Cmd.none
    )


type alias Flags =
    { globalConfig : GlobalConfig
    , globalState : GlobalState
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        HandleRequest bundle ->
            -- Start the business logic pipeline
            let
                _ = Debug.log "🐛 SubmitComment: Received request" bundle.request
                
                updatedModel = 
                    { model 
                    | stage = Processing
                    , request = Just bundle.request
                    , context = Just bundle.context
                    }
            in
            ( updatedModel
            , processRequest bundle.request updatedModel
            )
        
        ProcessingComplete result ->
            ( { model | stage = Complete result }
            , complete (encodeSubmitCommentRes result)
            )
        
        CommentCreated dbResponse ->
            let
                _ = Debug.log "🐛 SubmitComment: CommentCreated dbResponse" dbResponse
            in
            if dbResponse.success then
                -- Database operation succeeded, extract real data from response
                case dbResponse.data of
                    Just returnedData ->
                        let
                            -- Extract the auto-generated ID from database response
                            -- For now, create response with request data and a placeholder ID
                            -- TODO: Parse actual ID from returnedData JSON
                            apiComment = 
                                { id = "generated_id_from_db" -- Will be real UUID from database
                                , itemId = model.request |> Maybe.map .item_id |> Maybe.withDefault ""
                                , guestId = model.request |> Maybe.andThen .author_name |> Maybe.withDefault "guest_anonymous"
                                , parentId = model.request |> Maybe.andThen .parent_id
                                , authorName = model.request |> Maybe.andThen .author_name |> Maybe.withDefault "Anonymous"
                                , text = model.request |> Maybe.map .text |> Maybe.withDefault ""
                                , timestamp = model.globalConfig.serverNow
                                }
                    
                            response = { comment = apiComment }
                        in
                        ( { model | stage = Complete response }
                        , complete (encodeSubmitCommentRes response)
                        )
                    
                    Nothing ->
                        let
                            _ = Debug.log "🐛 SubmitComment: No data returned from database" ()
                        in
                        ( { model | stage = Failed "No data returned from database" }
                        , complete (encodeError "No data returned from database")
                        )
            else
                let
                    error = Maybe.withDefault "Database operation failed" dbResponse.error
                    _ = Debug.log "🐛 SubmitComment: DB Error" error
                in
                ( { model | stage = Failed error }
                , complete (encodeError error)
                )


-- BUSINESS LOGIC

{-| Get server-issued timestamp for reliable time operations
This ensures all timestamps come from the server, preventing client manipulation
-}
getServerTimestamp : GlobalConfig -> Int
getServerTimestamp config =
    config.serverNow


processRequest : SubmitCommentReq -> Model -> Cmd Msg
processRequest request model =
    -- Create a new comment and save it to database
    let
        -- Use server timestamp for consistency  
        currentTimestamp = getServerTimestamp model.globalConfig
        
        -- Create database insert data for raw dbCreate
        -- Note: id and host fields will be automatically generated/injected
        insertData = 
            Encode.object
                [ ("item_id", Encode.string request.item_id)
                , ("guest_id", Encode.string (Maybe.withDefault "guest_anonymous" request.author_name))
                , ("author_name", Encode.string (Maybe.withDefault "Anonymous" request.author_name))
                , ("text", Encode.string request.text)
                , ("created_at", Encode.int currentTimestamp)
                , ("parent_id", 
                    case request.parent_id of
                        Just pid -> Encode.string pid
                        Nothing -> Encode.null)
                ]
        
        -- Create database request with auto-generated ID
        dbRequest = 
            { id = "create_comment_" ++ String.fromInt currentTimestamp
            , table = "item_comments"
            , data = insertData
            }
    in
    -- Insert comment into database using raw dbCreate port
    DB.dbCreate dbRequest


-- ENCODING

encodeSubmitCommentRes : SubmitCommentRes -> Encode.Value
encodeSubmitCommentRes response =
    Api.Backend.submitCommentResEncoder response


encodeError : String -> Encode.Value
encodeError error =
    Encode.object
        [ ("error", Encode.string error)
        ]


-- PORTS (TEA Pattern)

port handleRequest : (RequestBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = update
        , subscriptions = subscriptions
        }


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ handleRequest HandleRequest
        , DB.dbResult CommentCreated
        ]
