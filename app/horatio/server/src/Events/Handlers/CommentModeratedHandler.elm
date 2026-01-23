port module Events.Handlers.CommentModeratedHandler exposing (main)

{-| CommentModerated Event Handler

Triggered by admin hooks when a comment's `removed` field changes.
Broadcasts SSE to all clients so they can update their UI in real-time.

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
                    let
                        removed = payload.newValue == "true"

                        -- Use generated encoder for consistent snake_case wire format
                        ssePayload = Sse.encodeCommentModeratedEvent
                            { commentId = payload.recordId
                            , removed = removed
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
                    ( { model | stage = Failed error }, Cmd.none )


-- DECODING

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
