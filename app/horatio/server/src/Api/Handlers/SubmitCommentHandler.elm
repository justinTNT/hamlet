port module Api.Handlers.SubmitCommentHandler exposing (main)

{-| SubmitComment Handler

This handler implements The Elm Architecture pattern for async request processing.
It demonstrates the req + state + stage pattern for complex async operations.

Business Logic:
Handles comment submission by creating new comment records in the database.

-}

import BuildAmp.Api exposing (SubmitCommentReq, SubmitCommentRes, CommentItem)
import BuildAmp.Database as DB
import BuildAmp.Events as Events
import BuildAmp.Services as Services
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
                        ( { model | stage = Failed "No data returned from database" }, Cmd.none )
            else
                let
                    error = Maybe.withDefault "Database operation failed" dbResponse.error
                in
                ( { model | stage = Failed error }, Cmd.none )


-- BUSINESS LOGIC

{-| Get server-issued timestamp for reliable time operations
This ensures all timestamps come from the server, preventing client manipulation
-}
getServerTimestamp : GlobalConfig -> Int
getServerTimestamp config =
    config.serverNow


{-| Convert text to RichContent format for storage.
If the text is already valid RichContent JSON (starts with {"type":"doc"), use it directly.
Otherwise, wrap plain text in RichContent structure.
-}
textToRichContent : String -> Encode.Value
textToRichContent textValue =
    -- Check if it's already RichContent JSON
    if String.startsWith "{\"type\":\"doc\"" textValue then
        -- Already RichContent - parse and use directly
        case Decode.decodeString Decode.value textValue of
            Ok jsonValue -> jsonValue
            Err _ -> wrapPlainText textValue
    else
        wrapPlainText textValue


{-| Wrap plain text in RichContent (ProseMirror doc) format.
-}
wrapPlainText : String -> Encode.Value
wrapPlainText plainText =
    Encode.object
        [ ( "type", Encode.string "doc" )
        , ( "content"
          , Encode.list identity
                [ Encode.object
                    [ ( "type", Encode.string "paragraph" )
                    , ( "content"
                      , Encode.list identity
                            [ Encode.object
                                [ ( "type", Encode.string "text" )
                                , ( "text", Encode.string plainText )
                                ]
                            ]
                      )
                    ]
                ]
          )
        ]


processRequest : SubmitCommentReq -> Model -> Cmd Msg
processRequest request model =
    let
        currentTimestamp = getServerTimestamp model.globalConfig

        -- Encode comment with RichContent for text field
        -- Framework fields (host, deletedAt, createdAt) are injected automatically by the runtime/DB
        encodeOptionalString maybeStr =
            case maybeStr of
                Just str -> Encode.string str
                Nothing -> Encode.null

        commentData =
            Encode.object
                [ ( "item_id", Encode.string request.itemId )
                , ( "guest_id", Encode.string (Maybe.withDefault "guest_anonymous" request.authorName) )
                , ( "parent_id", encodeOptionalString request.parentId )
                , ( "author_name", Encode.string (Maybe.withDefault "Anonymous" request.authorName) )
                , ( "text", textToRichContent request.text )
                ]
    in
    DB.dbCreate
        { id = "create_comment_" ++ String.fromInt currentTimestamp
        , table = "item_comment"
        , data = commentData
        }


-- DECODING

decodeRequest : RequestBundle -> Result String ( SubmitCommentReq, Context )
decodeRequest bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue BuildAmp.Api.submitCommentReqDecoder bundle.request |> Result.mapError Decode.errorToString)
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
    BuildAmp.Api.submitCommentResEncoder response


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
                , Services.broadcast "new_comment_event" (BuildAmp.Api.commentItemEncoder response.comment)
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