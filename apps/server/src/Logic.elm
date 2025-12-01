port module Logic exposing (main)

import Api.Backend exposing (..)
import Json.Decode as Decode exposing (Value)
import Json.Encode as Encode
import Platform

-- PORTS

port process : (Value -> msg) -> Sub msg
port result : Value -> Cmd msg

-- MODEL

type alias Model =
    ()

type Msg
    = ProcessRequest Value

-- MAIN

main : Program () Model Msg
main =
    Platform.worker
        { init = \_ -> ( (), Cmd.none )
        , update = update
        , subscriptions = subscriptions
        }

-- UPDATE

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ProcessRequest value ->
            case Decode.decodeValue Api.Backend.backendActionDecoder value of
                Ok action ->
                    let
                        res = handleAction action
                    in
                    ( model, result (Api.Backend.backendResultEncoder res) )

                Err error ->
                    let
                        errRes = Api.Backend.Error (Decode.errorToString error)
                    in
                    ( model, result (Api.Backend.backendResultEncoder errRes) )

handleAction : BackendAction -> BackendResult
handleAction action =
    case action of
        SubmitItem slice ->
            -- Logic: Create MicroblogItem from input
            -- In a real app, we would use UUID generator (passed in?) or just use a placeholder.
            -- And timestamp would be passed in or generated.
            -- For now, we'll use placeholder ID and timestamp 0 (or passed in slice if we add it).
            let
                item =
                    { id = "generated-id" -- Should be UUID
                    , title = slice.input.title
                    , link = slice.input.link
                    , image = slice.input.image
                    , extract = slice.input.extract
                    , ownerComment = slice.input.ownerComment
                    , tags = slice.input.tags
                    , timestamp = 0 -- Should be current time
                    }
            in
            SubmitItemSuccess item

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions _ =
    process ProcessRequest
