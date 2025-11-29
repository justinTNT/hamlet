module Main exposing (main)

import Api
import Api.Http
import Api.Schema
import Browser
import Html exposing (Html, button, div, h1, h2, h3, p, a, img, text, section)
import Html.Attributes exposing (src, href, style, class)
import Html.Events exposing (onClick)
import Http

-- MODEL

type Model
    = Loading
    | LoadedFeed (List Api.Schema.MicroblogItem)
    | Errored String

init : ( Model, Cmd Msg )
init =
    ( Loading
    , getFeed
    )

-- API CALLS

getFeed : Cmd Msg
getFeed =
    Api.getFeed { host = "localhost" }
        |> Api.Http.send GotFeed

submitItem : Cmd Msg
submitItem =
    Api.submitItem
        { host = "localhost"
        , title = "New Item from Elm"
        , link = "https://elm-lang.org"
        , image = "https://placehold.co/100x100"
        , extract = "This item was submitted via the generated Elm API."
        , ownerComment = "So much cleaner!"
        }
        |> Api.Http.send SubmittedItem

-- UPDATE

type Msg
    = PerformSubmitItem
    | GotFeed (Result Http.Error Api.Schema.GetFeedRes)
    | SubmittedItem (Result Http.Error Api.Schema.SubmitItemRes)

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PerformSubmitItem ->
            ( model, submitItem )

        GotFeed (Ok res) ->
            ( LoadedFeed res.items, Cmd.none )

        GotFeed (Err err) ->
            ( Errored ("Failed to fetch feed: " ++ httpErrorToString err), Cmd.none )

        SubmittedItem (Ok res) ->
            -- Refresh feed after submit
            ( Loading, getFeed )

        SubmittedItem (Err err) ->
            ( Errored ("Failed to submit item: " ++ httpErrorToString err), Cmd.none )

httpErrorToString : Http.Error -> String
httpErrorToString err =
    case err of
        Http.BadUrl url -> "Bad Url: " ++ url
        Http.Timeout -> "Timeout"
        Http.NetworkError -> "Network Error"
        Http.BadStatus status -> "Bad Status: " ++ String.fromInt status
        Http.BadBody body -> "Bad Body: " ++ body

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

        Errored errorMsg ->
            div [ style "color" "red" ]
                [ h2 [] [ text "Error" ]
                , div [] [ text errorMsg ]
                ]

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

-- MAIN

main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> init
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }

