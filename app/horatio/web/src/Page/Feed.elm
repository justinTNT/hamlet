module Page.Feed exposing (viewFeed, viewFeedItem)

{-| Feed page views.
-}

import BuildAmp.ApiClient as ApiClient
import Html exposing (Html, a, div, h2, img, section, text)
import Html.Attributes exposing (class, href, src, style)
import Html.Events exposing (onMouseEnter, onMouseLeave)
import Types exposing (FeedState(..), Model, Msg(..))
import Ui.RichContent exposing (viewRichContent)


viewFeed : Model -> Html Msg
viewFeed model =
    case model.feed of
        Loading ->
            div [] [ text "Loading Feed..." ]

        LoadedFeed items ->
            div [] (List.map (viewFeedItem model) items)

        Errored errorMsg ->
            div [ style "color" "red" ]
                [ h2 [] [ text "Error" ]
                , div [] [ text errorMsg ]
                ]


viewFeedItem : Model -> ApiClient.FeedItem -> Html Msg
viewFeedItem model item =
    let
        isHovered = model.hoveredItem == Just item.id
        backgroundColor = if isHovered then "#f5f5f5" else "white"
    in
    a
        [ href ("/item/" ++ item.id)
        , style "display" "block"
        , style "text-decoration" "none"
        , style "color" "inherit"
        ]
        [ section
            [ style "border" "1px solid #ddd"
            , style "padding" "15px"
            , style "margin-bottom" "15px"
            , style "border-radius" "8px"
            , style "cursor" "pointer"
            , style "transition" "background-color 0.2s"
            , style "background-color" backgroundColor
            , onMouseEnter (SetHoverState (Just item.id))
            , onMouseLeave (SetHoverState Nothing)
            ]
            [ div [ style "overflow" "hidden" ]
                [ case item.image of
                    Just imageUrl ->
                        img
                            [ src imageUrl
                            , style "float" "left"
                            , style "width" "25%"
                            , style "margin-right" "15px"
                            , style "margin-bottom" "10px"
                            ] []
                    Nothing ->
                        text ""
                , h2 [ style "margin-top" "0" ] [ text item.title ]
                , case item.extract of
                    Just extractText ->
                        div [ style "color" "#333" ] [ viewRichContent extractText ]
                    Nothing ->
                        text ""
                ]
            , div
                [ style "background" "#f0f0f0"
                , style "padding" "10px"
                , style "border-radius" "5px"
                , style "margin-top" "10px"
                , style "clear" "both"
                ]
                [ viewRichContent item.ownerComment ]
            ]
        ]
