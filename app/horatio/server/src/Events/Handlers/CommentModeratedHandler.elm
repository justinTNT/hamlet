port module Events.Handlers.CommentModeratedHandler exposing (main)

{-| CommentModerated Event Handler

Triggered by admin hooks when a comment's `removed` field changes.
Broadcasts SSE to all clients so they can update their UI in real-time.

Payload: { before : Maybe row, after : Maybe row }
For OnUpdate hooks, both before and after will have values.

-}

import BuildAmp.Events exposing (CommentModeratedPayload, EventContext, EventResult(..), commentModeratedPayloadDecoder, eventContextDecoder, encodeEventResult)
import BuildAmp.Sse as Sse
import Json.Encode as Encode
import Json.Decode as Decode
import Platform


-- MODEL

type alias Model =
    { stage : Stage
    , payload : Maybe CommentModeratedPayload
    , context : Maybe EventContext
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    }


type Stage
    = Idle
    | Complete EventResult
    | Failed String


type alias GlobalConfig =
    { serverNow : Int
    , hostIsolation : Bool
    , environment : String
    }


type alias GlobalState =
    { eventCount : Int
    , lastActivity : Int
    }


-- UPDATE

type Msg
    = HandleEvent EventBundle


type alias EventBundle =
    { payload : Encode.Value
    , context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , payload = Nothing
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
        HandleEvent bundle ->
            case decodeEventBundle bundle of
                Ok ( payload, ctx ) ->
                    -- Extract comment data from the "after" row
                    case decodeCommentFromRow payload.after of
                        Ok comment ->
                            let
                                -- Use generated encoder for consistent snake_case wire format
                                ssePayload = Sse.encodeCommentModeratedEvent
                                    { commentId = comment.id
                                    , removed = comment.removed
                                    }

                                result = Success
                                    { message = "CommentModerated SSE broadcast"
                                    , recordsAffected = 1
                                    }
                            in
                            ( { model
                              | stage = Complete result
                              , payload = Just payload
                              , context = Just ctx
                              }
                            , sseBroadcast { eventType = "comment_moderated", data = ssePayload }
                            )

                        Err error ->
                            ( { model | stage = Failed ("Failed to decode comment row: " ++ error) }, Cmd.none )

                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )


-- DECODING

{-| Minimal comment data we need from the row -}
type alias CommentData =
    { id : String
    , removed : Bool
    }


{-| Decode the essential comment fields from a row JSON value -}
decodeCommentFromRow : Decode.Value -> Result String CommentData
decodeCommentFromRow value =
    Decode.decodeValue commentDataDecoder value
        |> Result.mapError Decode.errorToString


commentDataDecoder : Decode.Decoder CommentData
commentDataDecoder =
    Decode.map2 CommentData
        (Decode.field "id" Decode.string)
        (Decode.field "removed" Decode.bool)


decodeEventBundle : EventBundle -> Result String ( CommentModeratedPayload, EventContext )
decodeEventBundle bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue commentModeratedPayloadDecoder bundle.payload |> Result.mapError Decode.errorToString)
        (Decode.decodeValue eventContextDecoder bundle.context |> Result.mapError Decode.errorToString)


-- PORTS

port handleEvent : (EventBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg
port sseBroadcast : { eventType : String, data : Encode.Value } -> Cmd msg


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
        Complete result ->
            ( newModel, Cmd.batch [ complete (encodeEventResult result), cmd ] )

        Failed error ->
            ( newModel, Cmd.batch [ complete (Encode.object [ ("success", Encode.bool False), ("error", Encode.string error) ]), cmd ] )

        _ ->
            ( newModel, cmd )


subscriptions : Model -> Sub Msg
subscriptions _ =
    handleEvent HandleEvent
