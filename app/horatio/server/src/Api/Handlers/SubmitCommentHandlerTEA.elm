port module Api.Handlers.SubmitCommentHandlerTEA exposing (main)

{-| SubmitComment Handler - TEA Architecture

This handler implements The Elm Architecture pattern for async request processing.
It demonstrates the req + state + stage pattern for complex async operations.

Business Logic:
Handles comment submission by creating new comment records in the database.

-}

import Api.Backend exposing (SubmitCommentReq, SubmitCommentRes, CommentItem)
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
    }


type Stage
    = Idle
    | Processing
    | Complete SubmitCommentRes
    | Failed String


type alias Context =
    { host : String
    , userId : Maybe String
    , isExtension : Bool
    }


type alias GlobalConfig = DB.GlobalConfig  -- Server-issued read-only config


type alias GlobalState = DB.GlobalState  -- Mutable handler state


-- UPDATE

type Msg
    = HandleRequest RequestBundle
    | CommentCreated DB.DbResponse


type alias RequestBundle =
    { request : Encode.Value
    , context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
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
            case decodeRequest bundle of
                Ok ( req, ctx ) ->
                    let
                        _ = Debug.log "🐛 SubmitComment: Received request" req
                        
                        updatedModel = 
                            { model 
                            | stage = Processing
                            , request = Just req
                            , context = Just ctx
                            }
                    in
                    ( updatedModel
                    , processRequest req updatedModel
                    )
                
                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )
        
        CommentCreated dbResponse ->
            let
                _ = Debug.log "🐛 SubmitComment: CommentCreated dbResponse" dbResponse
            in
            if dbResponse.success then
                -- Database operation succeeded, extract real data from response
                case dbResponse.data of
                    Just returnedData ->
                        -- Decode the returned comment data
                        case Decode.decodeValue (Decode.field "id" Decode.string) returnedData of
                            Ok generatedId ->
                                let
                                    apiComment = 
                                        { id = generatedId
                                        , itemId = model.request |> Maybe.map .itemId |> Maybe.withDefault ""
                                        , guestId = model.request |> Maybe.andThen .authorName |> Maybe.withDefault "guest_anonymous"
                                        , parentId = model.request |> Maybe.andThen .parentId
                                        , authorName = model.request |> Maybe.andThen .authorName |> Maybe.withDefault "Anonymous"
                                        , text = model.request |> Maybe.map .text |> Maybe.withDefault ""
                                        , timestamp = model.globalConfig.serverNow
                                        }
                        
                                    response = { comment = apiComment }
                                in
                                ( { model | stage = Complete response }, Cmd.none )
                            
                            Err _ ->
                                -- Fallback if we can't decode the ID
                                let
                                    apiComment = 
                                        { id = "comment_" ++ String.fromInt model.globalConfig.serverNow
                                        , itemId = model.request |> Maybe.map .itemId |> Maybe.withDefault ""
                                        , guestId = model.request |> Maybe.andThen .authorName |> Maybe.withDefault "guest_anonymous"
                                        , parentId = model.request |> Maybe.andThen .parentId
                                        , authorName = model.request |> Maybe.andThen .authorName |> Maybe.withDefault "Anonymous"
                                        , text = model.request |> Maybe.map .text |> Maybe.withDefault ""
                                        , timestamp = model.globalConfig.serverNow
                                        }
                        
                                    response = { comment = apiComment }
                                in
                                ( { model | stage = Complete response }, Cmd.none )
                    
                    Nothing ->
                        let
                            _ = Debug.log "🐛 SubmitComment: No data returned from database" ()
                        in
                        ( { model | stage = Failed "No data returned from database" }, Cmd.none )
            else
                let
                    error = Maybe.withDefault "Database operation failed" dbResponse.error
                    _ = Debug.log "🐛 SubmitComment: DB Error" error
                in
                ( { model | stage = Failed error }, Cmd.none )


-- BUSINESS LOGIC

{-| Get server-issued timestamp for reliable time operations
This ensures all timestamps come from the server, preventing client manipulation
-}
getServerTimestamp : GlobalConfig -> Int
getServerTimestamp config =
    config.serverNow


processRequest : SubmitCommentReq -> Model -> Cmd Msg
processRequest request model =
    let
        currentTimestamp = getServerTimestamp model.globalConfig

        -- Use type-safe DbCreate encoder
        -- Framework fields (host, deletedAt) are injected automatically by the runtime
        commentData : DB.ItemCommentDbCreate
        commentData =
            { itemId = request.itemId
            , guestId = Maybe.withDefault "guest_anonymous" request.authorName
            , parentId = request.parentId
            , authorName = Maybe.withDefault "Anonymous" request.authorName
            , text = request.text
            , createdAt = currentTimestamp
            }
    in
    DB.dbCreate
        { id = "create_comment_" ++ String.fromInt currentTimestamp
        , table = "item_comment"
        , data = DB.encodeItemCommentDbCreate commentData
        }


-- DECODING

decodeRequest : RequestBundle -> Result String ( SubmitCommentReq, Context )
decodeRequest bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue Api.Backend.submitCommentReqDecoder bundle.request |> Result.mapError Decode.errorToString)
        (Decode.decodeValue contextDecoder bundle.context |> Result.mapError Decode.errorToString)


contextDecoder : Decode.Decoder Context
contextDecoder =
    Decode.map3 Context
        (Decode.field "host" Decode.string)
        (Decode.maybe (Decode.field "userId" Decode.string))
        (Decode.field "isExtension" Decode.bool)


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
        , update = updateWithResponse
        , subscriptions = subscriptions
        }


updateWithResponse : Msg -> Model -> ( Model, Cmd Msg )
updateWithResponse msg model =
    let
        ( newModel, cmd ) = update msg model
    in
    case newModel.stage of
        Complete response ->
            ( newModel
            , Cmd.batch
                [ complete (encodeSubmitCommentRes response)
                , cmd
                ]
            )

        Failed error ->
            ( newModel
            , Cmd.batch
                [ complete (encodeError error)
                , cmd
                ]
            )

        _ ->
            ( newModel, cmd )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ handleRequest HandleRequest
        , DB.dbResult CommentCreated
        ]