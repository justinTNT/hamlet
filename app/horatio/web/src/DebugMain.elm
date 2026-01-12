module DebugMain exposing (main)

import Browser
import Html exposing (..)
import Html.Events exposing (..)
import Http
import Json.Decode as Decode
import Api
import Api.Schema
import Api.Http


type Model
    = Initial
    | Loading
    | Success Api.Schema.GetFeedRes
    | Failed String


type Msg
    = FetchFeed
    | GotResponse (Result Http.Error Api.Schema.GetFeedRes)


init : () -> ( Model, Cmd Msg )
init _ =
    ( Initial, Cmd.none )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        FetchFeed ->
            ( Loading
            , Api.getFeed { host = "localhost" }
                |> Api.Http.send GotResponse
            )

        GotResponse (Ok res) ->
            ( Success res, Cmd.none )

        GotResponse (Err err) ->
            ( Failed (httpErrorToString err), Cmd.none )


httpErrorToString : Http.Error -> String
httpErrorToString err =
    case err of
        Http.BadUrl url -> "Bad Url: " ++ url
        Http.Timeout -> "Timeout"
        Http.NetworkError -> "Network Error"
        Http.BadStatus status -> "Bad Status: " ++ String.fromInt status
        Http.BadBody body -> "Bad Body: " ++ body


view : Model -> Html Msg
view model =
    div []
        [ h1 [] [ text "Debug Feed Fetch" ]
        , button [ onClick FetchFeed ] [ text "Fetch Feed" ]
        , div []
            [ case model of
                Initial ->
                    text "Click button to fetch"

                Loading ->
                    text "Loading..."

                Success res ->
                    div []
                        [ text "Success! Items: "
                        , text (String.fromInt (List.length res.items))
                        ]

                Failed err ->
                    div []
                        [ text "Error: "
                        , text err
                        ]
            ]
        ]


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }