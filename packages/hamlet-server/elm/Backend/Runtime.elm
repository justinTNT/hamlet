port module Backend.Runtime exposing
    ( run
    , Flags
    , Context
    )

{-| Generic TEA runtime for Script handlers.

This module provides the boilerplate TEA machinery so you can write
simple Script handlers without dealing with Model, Msg, Stage, etc.

Usage (in a generated runner file):

    import Backend.Runtime as Runtime
    import Api.Handlers.SubmitItem as Handler

    main =
        Runtime.run
            { handler = Handler.handler
            , decodeRequest = Handler.decodeRequest
            , encodeResponse = Handler.encodeResponse
            }

-}

import Backend.Script as Script exposing (Script, Step(..))
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Platform
import Task


{-| Configuration for running a script handler -}
type alias Config req res =
    { handler : req -> Context -> GlobalConfig -> Script res
    , decodeRequest : Decoder req
    , encodeResponse : res -> Encode.Value
    }


{-| Request context from the server -}
type alias Context =
    { host : String
    , userId : Maybe String
    , sessionId : Maybe String
    }


{-| Global config provided at init -}
type alias GlobalConfig =
    { serverNow : Int
    , hostIsolation : Bool
    , environment : String
    }


{-| Flags passed from JS -}
type alias Flags =
    { globalConfig : GlobalConfig
    , globalState : GlobalState
    }


type alias GlobalState =
    { requestCount : Int
    , lastActivity : Int
    }


{-| Internal model - tracks pending continuation -}
type alias Model res =
    { continuation : Maybe (Result String Encode.Value -> Script res)
    , config : GlobalConfig
    , opCounter : Int
    , encodeResponse : res -> Encode.Value
    }


{-| Internal messages -}
type Msg
    = HandleRequest RequestBundle
    | DbResultReceived DbResponse


type alias RequestBundle =
    { request : Encode.Value
    , context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
    }


type alias DbResponse =
    { id : String
    , success : Bool
    , data : Maybe Encode.Value
    , error : Maybe String
    }


{-| Create a Platform.worker that runs a Script handler -}
run : Config req res -> Program Flags (Model res) Msg
run config =
    Platform.worker
        { init = init config.encodeResponse
        , update = update config
        , subscriptions = subscriptions
        }


init : (res -> Encode.Value) -> Flags -> ( Model res, Cmd Msg )
init encodeResponse flags =
    ( { continuation = Nothing
      , config = flags.globalConfig
      , opCounter = 0
      , encodeResponse = encodeResponse
      }
    , Cmd.none
    )


update : Config req res -> Msg -> Model res -> ( Model res, Cmd Msg )
update config msg model =
    case msg of
        HandleRequest bundle ->
            case decodeBundle config.decodeRequest bundle of
                Ok ( req, ctx ) ->
                    let
                        script =
                            config.handler req ctx model.config
                    in
                    runScript model script

                Err err ->
                    ( model, complete (encodeError err) )

        DbResultReceived response ->
            case model.continuation of
                Just cont ->
                    let
                        result =
                            if response.success then
                                case response.data of
                                    Just data ->
                                        Ok data

                                    Nothing ->
                                        Err "No data in response"

                            else
                                Err (Maybe.withDefault "Database error" response.error)

                        nextScript =
                            cont result
                    in
                    runScript { model | continuation = Nothing } nextScript

                Nothing ->
                    ( model, Cmd.none )


{-| Run the script until it needs to wait for an async result -}
runScript : Model res -> Script res -> ( Model res, Cmd Msg )
runScript model script =
    case Script.run script of
        Done (Ok result) ->
            ( { model | continuation = Nothing }
            , complete (model.encodeResponse result)
            )

        Done (Err err) ->
            ( { model | continuation = Nothing }
            , complete (encodeError err)
            )

        Continue op cont ->
            let
                ( cmd, newCounter ) =
                    executeOp model.opCounter op
            in
            ( { model
              | continuation = Just cont
              , opCounter = newCounter
              }
            , cmd
            )


{-| Execute a Script operation as a Cmd -}
executeOp : Int -> Script.Operation -> ( Cmd Msg, Int )
executeOp counter op =
    let
        opId =
            "script_op_" ++ String.fromInt counter
    in
    case op of
        Script.DbCreate { table, data } ->
            ( dbCreate
                { id = opId
                , table = table
                , data = data
                }
            , counter + 1
            )

        Script.DbFind { table, query } ->
            ( dbFind
                { id = opId
                , table = table
                , query = query
                }
            , counter + 1
            )

        Script.Broadcast { eventType, data } ->
            -- Fire-and-forget: send broadcast and immediately continue
            ( Cmd.batch
                [ sseBroadcast { eventType = eventType, data = data }
                , Task.perform
                    (\_ ->
                        DbResultReceived
                            { id = opId
                            , success = True
                            , data = Just (Encode.object [])
                            , error = Nothing
                            }
                    )
                    (Task.succeed ())
                ]
            , counter + 1
            )


decodeBundle : Decoder req -> RequestBundle -> Result String ( req, Context )
decodeBundle reqDecoder bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue reqDecoder bundle.request
            |> Result.mapError Decode.errorToString
        )
        (Decode.decodeValue contextDecoder bundle.context
            |> Result.mapError Decode.errorToString
        )


contextDecoder : Decoder Context
contextDecoder =
    Decode.map3 Context
        (Decode.field "host" Decode.string)
        (Decode.maybe (Decode.field "userId" Decode.string))
        (Decode.maybe (Decode.field "sessionId" Decode.string))


encodeError : String -> Encode.Value
encodeError err =
    Encode.object [ ( "error", Encode.string err ) ]



-- PORTS


port handleRequest : (RequestBundle -> msg) -> Sub msg


port complete : Encode.Value -> Cmd msg


port dbCreate : { id : String, table : String, data : Encode.Value } -> Cmd msg


port dbFind : { id : String, table : String, query : Encode.Value } -> Cmd msg


port sseBroadcast : { eventType : String, data : Encode.Value } -> Cmd msg


port dbResult : (DbResponse -> msg) -> Sub msg



-- SUBSCRIPTIONS


subscriptions : Model res -> Sub Msg
subscriptions _ =
    Sub.batch
        [ handleRequest HandleRequest
        , dbResult DbResultReceived
        ]
