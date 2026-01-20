module Main exposing (main)

{-| BuildAmp Template App

A minimal starting point. Run `npm run generate` to generate API clients
from your Elm models in shared/, then import them here.

-}

import Browser
import Html exposing (Html, div, button, text, h1, p)
import Html.Events exposing (onClick)


-- MODEL


type alias Model =
    { count : Int
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( { count = 0 }, Cmd.none )


-- UPDATE


type Msg
    = Increment
    | Decrement


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Increment ->
            ( { model | count = model.count + 1 }, Cmd.none )

        Decrement ->
            ( { model | count = model.count - 1 }, Cmd.none )


-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ h1 [] [ text "BuildAmp App" ]
        , p [] [ text ("Count: " ++ String.fromInt model.count) ]
        , button [ onClick Decrement ] [ text "-" ]
        , button [ onClick Increment ] [ text "+" ]
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
