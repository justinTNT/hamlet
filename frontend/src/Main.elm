port module Main exposing (main)

import Api.Schema
import Browser
import Dict exposing (Dict)
import Html exposing (Html, button, div, h1, h2, h3, p, a, img, text, section)
import Html.Attributes exposing (src, href, style, class)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Random
import Task
import UUID exposing (UUID, toString)
import Debug

-- PORTS

port rpcRequest : RpcRequest -> Cmd msg
port rpcResponse : (RpcResponse -> msg) -> Sub msg
port log : String -> Cmd msg

-- RPC TYPES

type alias RpcRequest =
    { endpoint : String
    , body : Encode.Value
    , correlationId : String
    }

type alias RpcResponse =
    { endpoint : String
    , body : String
    , correlationId : String
    }

type Endpoint req res
    = Endpoint
        { name : String
        , encoder : req -> Encode.Value
        , decoder : Decoder res
        }

-- MODEL

type ApiResponse
    = ResGetFeed Api.Schema.GetFeedRes
    | ResSubmitItem Api.Schema.SubmitItemRes

type alias PendingRequest =
    { decoder : Decoder ApiResponse
    , toMsg : Result Api.Schema.ApiError ApiResponse -> Msg
    }

type Model
    = Loading
    | LoadedFeed (List Api.Schema.MicroblogItem)
    | Errored Api.Schema.ApiError
    | WaitingForRpc (Dict String PendingRequest)

init : ( Model, Cmd Msg )
init =
    ( Loading, Random.generate (NewUuid ReqGetFeed) UUID.generator )

-- HELPER FUNCTIONS

call : UUID -> String -> Encode.Value -> Cmd Msg
call correlationId endpoint body =
    let
        correlationIdString =
            toString correlationId

        rpcReq =
            { endpoint = endpoint
            , body = body
            , correlationId = correlationIdString
            }
    in
    rpcRequest rpcReq

-- UPDATE

type RequestType
    = ReqGetFeed
    | ReqSubmitItem

type Msg
    = PerformSubmitItem
    | NewUuid RequestType UUID
    | RpcReceived RpcResponse
    | RpcReceivedInternal (Result Api.Schema.ApiError ApiResponse)

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case ( msg, model ) of
        ( PerformSubmitItem, _ ) ->
            ( model, Random.generate (NewUuid ReqSubmitItem) UUID.generator )

        ( NewUuid reqType uuid, _ ) ->
            let
                _ = Debug.log "NewUuid received" (toString uuid)
                uuidString = toString uuid
                debugCmd = log ("NewUuid fired: " ++ uuidString)

                pendingRequests = 
                    case reqType of
                        ReqGetFeed ->
                            let
                                req = { host = "localhost" } -- Host is implicit in header usually, but schema has it
                                decoder = Decode.map ResGetFeed Api.Schema.getFeedResDecoder
                                pending = PendingRequest decoder RpcReceivedInternal
                            in
                            ( Dict.singleton uuidString pending
                            , call uuid "GetFeed" (Api.Schema.getFeedReqEncoder req)
                            )

                        ReqSubmitItem ->
                            let
                                req = { host = "localhost"
                                      , title = "New Item from Elm"
                                      , link = "https://elm-lang.org"
                                      , image = "https://placehold.co/100x100"
                                      , extract = "This item was submitted via the Elm Reader app."
                                      , ownerComment = "Pretty cool."
                                      }
                                decoder = Decode.map ResSubmitItem Api.Schema.submitItemResDecoder
                                pending = PendingRequest decoder RpcReceivedInternal
                            in
                            ( Dict.singleton uuidString pending
                            , call uuid "SubmitItem" (Api.Schema.submitItemReqEncoder req)
                            )
            in
            case pendingRequests of
                ( pendingMap, cmd ) ->
                    ( WaitingForRpc pendingMap, Cmd.batch [cmd, debugCmd] )

        ( RpcReceived response, WaitingForRpc pendingRequests ) ->
            case Dict.get response.correlationId pendingRequests of
                Just { decoder, toMsg } ->
                    case Decode.decodeString Api.Schema.apiErrorDecoder response.body of
                        Ok apiError ->
                            Task.succeed (Err apiError) |> Task.perform toMsg |> Tuple.pair model

                        Err _ ->
                            case Decode.decodeString decoder response.body of
                                Ok decodedData ->
                                    Task.succeed (Ok decodedData) |> Task.perform toMsg |> Tuple.pair model

                                Err err ->
                                    Task.succeed (Err (Api.Schema.InternalError { details = Debug.toString err })) |> Task.perform toMsg |> Tuple.pair model

                Nothing ->
                    ( model, Cmd.none )
        
        ( RpcReceivedInternal (Ok response), _ ) ->
            case response of
                ResGetFeed data ->
                    ( LoadedFeed data.items, Cmd.none )
                
                ResSubmitItem _ ->
                    -- Refresh feed after submit
                    ( Loading, Random.generate (NewUuid ReqGetFeed) UUID.generator )

        ( RpcReceivedInternal (Err apiError), _ ) ->
            ( Errored apiError, Cmd.none )
        
        _ ->
            (model, Cmd.none)

-- VIEW

view : Model -> Html Msg
view model =
    div [ style "font-family" "sans-serif", style "max-width" "800px", style "margin" "0 auto", style "padding" "20px" ]
        [ h1 [] [ text "Horatio Reader" ]
        , button [ onClick PerformSubmitItem, style "margin-bottom" "20px" ] [ text "Test: Submit Item" ]
        , viewContent model
        ]

viewContent : Model -> Html Msg
viewContent model =
    case model of
        Loading ->
            div [] [ text "Loading Feed..." ]

        LoadedFeed items ->
            div [] (List.map viewItem items)

        Errored apiError ->
            div [ style "color" "red" ]
                [ h2 [] [ text "Error" ]
                , case apiError of
                    Api.Schema.ValidationError details ->
                        div [] [ text ("Validation Error: " ++ details.details) ]

                    Api.Schema.NotFound details ->
                        div [] [ text ("Not Found: " ++ details.details) ]

                    Api.Schema.InternalError details ->
                        div [] [ text ("Internal Error: " ++ details.details) ]
                ]

        WaitingForRpc _ ->
            div [] [ text "Waiting..." ]

viewItem : Api.Schema.MicroblogItem -> Html Msg
viewItem item =
    section [ style "border" "1px solid #ddd", style "padding" "15px", style "margin-bottom" "15px", style "border-radius" "8px" ]
        [ h2 [] [ text item.title ]
        , a [ href item.link, style "color" "blue" ] [ text item.link ]
        , div [ style "margin" "10px 0" ] 
            [ img [ src item.image, style "max-width" "100%", style "height" "auto" ] [] ]
        , p [] [ text item.extract ]
        , div [ style "background" "#f9f9f9", style "padding" "10px", style "font-style" "italic" ]
            [ text ("Owner: " ++ item.ownerComment) ]
        ]

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions _ =
    rpcResponse RpcReceived

-- MAIN

main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }
