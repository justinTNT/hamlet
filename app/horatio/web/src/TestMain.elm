module TestMain exposing (main)

-- Using exact same imports as Main.elm
import Api
import Api.Http
import Api.Schema
import Browser
import Html exposing (..)
import Http


type Msg
    = GotFeed (Result Http.Error Api.Schema.GetFeedRes)


main : Program () String Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }


init : () -> ( String, Cmd Msg )
init _ =
    ( "Loading..."
    , Api.getFeed { host = "localhost" }
        |> Api.Http.send GotFeed
    )


update : Msg -> String -> ( String, Cmd Msg )
update msg _ =
    case msg of
        GotFeed (Ok res) ->
            ( "Success! Items: " ++ String.fromInt (List.length res.items), Cmd.none )

        GotFeed (Err err) ->
            ( "Error: " ++ httpErrorToString err, Cmd.none )


httpErrorToString : Http.Error -> String
httpErrorToString err =
    case err of
        Http.BadUrl url -> "Bad Url: " ++ url
        Http.Timeout -> "Timeout"
        Http.NetworkError -> "Network Error"
        Http.BadStatus status -> "Bad Status: " ++ String.fromInt status
        Http.BadBody body -> "Bad Body: " ++ body


view : String -> Html Msg
view model =
    div []
        [ h1 [] [ text "Test Main" ]
        , p [] [ text model ]
        ]