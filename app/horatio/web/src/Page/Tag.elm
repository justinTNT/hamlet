module Page.Tag exposing (viewTagPage, viewTag, tagColor)

{-| Tag page views and tag rendering utilities.
-}

import BuildAmp.ApiClient as ApiClient
import Dict
import Html exposing (Html, a, div, h2, span, text)
import Html.Attributes exposing (class, href, style)
import Page.Feed exposing (viewFeedItem)
import Types exposing (Model, Msg(..), TagItemsState(..))
import Url


viewTagPage : Model -> String -> Html Msg
viewTagPage model tagName =
    div []
        [ h2 [ style "margin-bottom" "20px" ]
            [ text "Items tagged: "
            , span
                [ style "background" (tagColor tagName)
                , style "color" "white"
                , style "padding" "4px 12px"
                , style "border-radius" "16px"
                , style "font-size" "0.9em"
                ]
                [ text tagName ]
            ]
        , case Dict.get tagName model.tagItems of
            Just TagItemsLoading ->
                div [] [ text "Loading items..." ]

            Just (TagItemsLoaded items) ->
                if List.isEmpty items then
                    div [ style "color" "#666" ] [ text "No items found with this tag." ]
                else
                    div [] (List.map (viewFeedItem model) items)

            Just (TagItemsFailed error) ->
                div [ style "color" "red" ] [ text error ]

            Nothing ->
                div [] [ text "Loading items..." ]
        ]


viewTag : Model -> String -> Html Msg
viewTag _ tag =
    a
        [ href ("/tag/" ++ Url.percentEncode tag)
        , class "tag"
        , style "background-color" (tagColor tag)
        ]
        [ text tag ]


{-| Generate a consistent color for a tag based on its name
-}
tagColor : String -> String
tagColor tag =
    let
        -- Simple hash function to get a number from the string
        hash = String.foldl (\c acc -> Char.toCode c + acc * 31) 0 tag
        -- Pick from a nice palette of colors
        colors =
            [ "#e74c3c"  -- red
            , "#3498db"  -- blue
            , "#2ecc71"  -- green
            , "#9b59b6"  -- purple
            , "#f39c12"  -- orange
            , "#1abc9c"  -- teal
            , "#e91e63"  -- pink
            , "#00bcd4"  -- cyan
            ]
        index = modBy (List.length colors) hash
    in
    List.drop index colors |> List.head |> Maybe.withDefault "#666"
