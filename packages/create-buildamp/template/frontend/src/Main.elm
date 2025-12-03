module Main exposing (main)

import Browser
import Html exposing (Html, div, button, text, h1, p)
import Html.Attributes
import Html.Events exposing (onClick)
import Http
import Api.Schema exposing (..)
import Json.Encode as Encode
import Json.Decode as Decode

-- MODEL

type alias Model =
    { count : Int
    , error : Maybe String
    }

init : () -> ( Model, Cmd Msg )
init _ =
    ( { count = 0, error = Nothing }, Cmd.none )

-- UPDATE

type Msg
    = Increment
    | GotIncrementRes (Result Http.Error IncrementRes)

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Increment ->
            ( model
            , Http.post
                { url = "/api"
                , body = Http.jsonBody <|
                    Encode.object
                        [ ( "endpoint", Encode.string "Increment" )
                        , ( "body", incrementReqEncoder { amount = 1 } )
                        ]
                , expect = Http.expectJson GotIncrementRes incrementResDecoder
                }
            )

        GotIncrementRes (Ok res) ->
            ( { model | count = res.newValue, error = Nothing }, Cmd.none )

        GotIncrementRes (Err err) ->
            ( { model | error = Just "Failed to increment" }, Cmd.none )

-- VIEW

view : Model -> Html Msg
view model =
    div []
        [ h1 [] [ text "BuildAmp Counter" ]
        , p [] [ text ("Count: " ++ String.fromInt model.count) ]
        , button [ onClick Increment ] [ text "Increment" ]
        , case model.error of
            Just err -> div [ Html.Attributes.style "color" "red" ] [ text err ]
            Nothing -> text ""
        ]

-- MAIN

main : Program () Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }

-- Note: Encoders/Decoders are generated in Api.Schema.elm by cargo test
-- We mock them here for the template to compile before generation if needed,
-- but ideally we run generation first.
-- For this template, we assume Api.Schema exists or will be generated.
