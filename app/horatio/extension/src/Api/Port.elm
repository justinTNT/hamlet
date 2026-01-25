module Api.Port exposing (Model, Msg, init, update, send, subscriptions)

{-| Port-based API communication for browser extensions.

    Auto-generated module that handles request/response correlation
    through ports instead of direct HTTP.
-}

import Api
import Dict exposing (Dict)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Task


-- MODEL


type alias Model msg =
    { pending : Dict String (Result String Encode.Value -> msg)
    , counter : Int
    }


init : Model msg
init =
    { pending = Dict.empty
    , counter = 0
    }



-- MSG


type Msg msg
    = Send String Encode.Value (Result String Encode.Value -> msg)
    | Received Encode.Value



-- UPDATE


update :
    { sendPort : Encode.Value -> Cmd msg
    }
    -> Msg msg
    -> Model msg
    -> ( Model msg, Cmd msg )
update config msg model =
    case msg of
        Send endpoint body callback ->
            let
                newCounter =
                    model.counter + 1

                correlationId =
                    String.fromInt newCounter

                payload =
                    Encode.object
                        [ ( "endpoint", Encode.string endpoint )
                        , ( "body", body )
                        , ( "correlationId", Encode.string correlationId )
                        ]

                newPending =
                    Dict.insert correlationId callback model.pending
            in
            ( { model | counter = newCounter, pending = newPending }
            , config.sendPort payload
            )

        Received val ->
            let
                envelopeDecoder =
                    Decode.map3 (\c b e -> { correlationId = c, body = b, error = e })
                        (Decode.field "correlationId" Decode.string)
                        (Decode.field "body" Decode.value)
                        (Decode.maybe (Decode.field "error" Decode.string))
            in
            case Decode.decodeValue envelopeDecoder val of
                Ok { correlationId, body, error } ->
                    case Dict.get correlationId model.pending of
                        Just callback ->
                            let
                                result =
                                    case error of
                                        Just err ->
                                            Err err

                                        Nothing ->
                                            Ok body

                                cmd =
                                    Task.succeed (callback result)
                                        |> Task.perform identity
                            in
                            ( { model | pending = Dict.remove correlationId model.pending }
                            , cmd
                            )

                        Nothing ->
                            ( model, Cmd.none )

                Err _ ->
                    ( model, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : ((Encode.Value -> msg) -> Sub msg) -> (Msg msg -> msg) -> Sub msg
subscriptions portSub toMsg =
    portSub (\val -> toMsg (Received val))



-- HELPER


send : (Result String response -> msg) -> Api.Request response -> Msg msg
send toMsg req =
    let
        callback : Result String Encode.Value -> msg
        callback result =
            case result of
                Ok json ->
                    case Decode.decodeValue req.decoder json of
                        Ok response ->
                            toMsg (Ok response)

                        Err decodeErr ->
                            toMsg (Err (Decode.errorToString decodeErr))

                Err err ->
                    toMsg (Err err)
    in
    Send req.endpoint req.body callback
