port module Popup exposing (main)

import Api
import Api.Port
import Api.Schema
import Browser
import Html exposing (Html, button, div, h3, text, input)
import Html.Attributes exposing (placeholder, value, style)
import Html.Events exposing (onClick, onInput)
import Json.Encode as Encode

-- PORTS

port outbound : Encode.Value -> Cmd msg
port inbound : (Encode.Value -> msg) -> Sub msg

-- MODEL

type alias Model =
    { portModel : Api.Port.Model Msg
    , status : String
    , urlInput : String
    }

init : () -> ( Model, Cmd Msg )
init _ =
    ( { portModel = Api.Port.init
      , status = "Ready"
      , urlInput = ""
      }
    , Cmd.none
    )

-- UPDATE

type Msg
    = PortMsg (Api.Port.Msg Msg)
    | SubmitUrl
    | UrlChanged String
    | GotSubmitRes (Result String Api.Schema.SubmitItemRes)

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PortMsg pMsg ->
            let
                ( newPortModel, cmd ) =
                    Api.Port.update
                        { sendPort = outbound }
                        pMsg
                        model.portModel
            in
            ( { model | portModel = newPortModel }
            , cmd
            )

        SubmitUrl ->
            let
                req = 
                    Api.submitItem
                        { host = "extension"
                        , title = "Saved from Extension"
                        , link = model.urlInput
                        , image = ""
                        , extract = ""
                        , ownerComment = "Saved via Horatio Writer"
                        }
                
                portMsg = Api.Port.send GotSubmitRes req
                
                -- We manually trigger the port update logic
                ( newPortModel, cmd ) =
                    Api.Port.update
                        { sendPort = outbound }
                        portMsg
                        model.portModel
            in
            ( { model | portModel = newPortModel, status = "Submitting..." }
            , cmd
            )
        
        UrlChanged val ->
            ( { model | urlInput = val }, Cmd.none )
        
        GotSubmitRes (Ok _) ->
            ( { model | status = "Success!" }, Cmd.none )

        GotSubmitRes (Err err) ->
            ( { model | status = "Error: " ++ err }, Cmd.none )

-- VIEW

view : Model -> Html Msg
view model =
    div [ style "width" "300px", style "padding" "10px" ]
        [ h3 [] [ text "Horatio Writer" ]
        , input 
            [ placeholder "URL to save"
            , value model.urlInput
            , onInput UrlChanged
            , style "width" "100%"
            , style "margin-bottom" "10px"
            ] []
        , button [ onClick SubmitUrl ] [ text "Submit" ]
        , div [ style "margin-top" "10px" ] [ text model.status ]
        ]

-- MAIN

main : Program () Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = \_ -> Api.Port.subscriptions inbound PortMsg
        }
