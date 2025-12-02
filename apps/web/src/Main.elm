module Main exposing (main)

import Api
import Api.Http
import Api.Schema
import Browser
import Html exposing (Html, button, div, h1, h2, h3, h4, p, a, img, text, section, input, textarea, label)
import Html.Attributes exposing (src, href, style, class, value, placeholder)
import Html.Events exposing (onClick, onInput)
import Http

-- MODEL

type alias Model =
    { feed : FeedState
    , replyingTo : Maybe { itemId : String, parentId : Maybe String }
    , newComment : String
    , authorName : String
    }

type FeedState
    = Loading
    | LoadedFeed (List Api.Schema.MicroblogItem)
    | Errored String

init : ( Model, Cmd Msg )
init =
    ( { feed = Loading
      , replyingTo = Nothing
      , newComment = ""
      , authorName = ""
      }
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
        , tags = []
        }
        |> Api.Http.send SubmittedItem

submitComment : Model -> Cmd Msg
submitComment model =
    case model.replyingTo of
        Just { itemId, parentId } ->
            Api.submitComment
                { host = "localhost"
                , itemId = itemId
                , parentId = parentId
                , text = model.newComment
                , authorName = if String.isEmpty model.authorName then Nothing else Just model.authorName
                }
                |> Api.Http.send SubmittedComment
        
        Nothing ->
            Cmd.none

-- UPDATE

type Msg
    = PerformSubmitItem
    | GotFeed (Result Http.Error Api.Schema.GetFeedRes)
    | SubmittedItem (Result Http.Error Api.Schema.SubmitItemRes)
    | SetReplyTo String (Maybe String)
    | SetCommentText String
    | SetAuthorName String
    | PerformSubmitComment
    | SubmittedComment (Result Http.Error Api.Schema.SubmitCommentRes)
    | CancelReply

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PerformSubmitItem ->
            ( model, submitItem )

        GotFeed (Ok res) ->
            ( { model | feed = LoadedFeed res.items }, Cmd.none )

        GotFeed (Err err) ->
            ( { model | feed = Errored ("Failed to fetch feed: " ++ httpErrorToString err) }, Cmd.none )

        SubmittedItem (Ok res) ->
            -- Refresh feed after submit
            ( { model | feed = Loading }, getFeed )

        SubmittedItem (Err err) ->
            ( { model | feed = Errored ("Failed to submit item: " ++ httpErrorToString err) }, Cmd.none )

        SetReplyTo itemId parentId ->
            ( { model | replyingTo = Just { itemId = itemId, parentId = parentId }, newComment = "" }, Cmd.none )

        SetCommentText text ->
            ( { model | newComment = text }, Cmd.none )

        SetAuthorName name ->
            ( { model | authorName = name }, Cmd.none )

        PerformSubmitComment ->
            ( model, submitComment model )

        SubmittedComment (Ok _) ->
            ( { model | replyingTo = Nothing, newComment = "", feed = Loading }, getFeed ) -- Refresh feed to show new comment

        SubmittedComment (Err err) ->
            ( { model | feed = Errored ("Failed to submit comment: " ++ httpErrorToString err) }, Cmd.none )

        CancelReply ->
            ( { model | replyingTo = Nothing, newComment = "" }, Cmd.none )

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
    case model.feed of
        Loading ->
            div [] [ text "Loading Feed..." ]

        LoadedFeed items ->
            div [] (List.map (viewItem model) items)

        Errored errorMsg ->
            div [ style "color" "red" ]
                [ h2 [] [ text "Error" ]
                , div [] [ text errorMsg ]
                ]

viewItem : Model -> Api.Schema.MicroblogItem -> Html Msg
viewItem model item =
    section [ style "border" "1px solid #ddd", style "padding" "15px", style "margin-bottom" "15px", style "border-radius" "8px" ]
        [ h2 [] [ text item.title ]
        , a [ href item.link, style "color" "blue" ] [ text item.link ]
        , div [ style "margin" "10px 0" ] 
            [ img [ src item.image, style "max-width" "100%", style "height" "auto" ] [] ]
        , p [] [ text item.extract ]
        , div [ style "margin-bottom" "10px" ]
            (List.map viewTag item.tags)
        , div [ style "background" "#f9f9f9", style "padding" "10px", style "font-style" "italic" ]
            [ text ("Owner: " ++ item.ownerComment) ]
        
        -- Comments Section
        , div [ style "margin-top" "20px", style "border-top" "1px solid #eee", style "padding-top" "10px" ]
            [ h3 [] [ text "Comments" ]
            , div [] (List.map (viewComment model item.id item.comments) (filterRootComments item.comments))
            , viewReplyButton model item.id Nothing
            ]
        ]

filterRootComments : List Api.Schema.ItemComment -> List Api.Schema.ItemComment
filterRootComments comments =
    List.filter (\c -> c.parentId == Nothing) comments

viewComment : Model -> String -> List Api.Schema.ItemComment -> Api.Schema.ItemComment -> Html Msg
viewComment model itemId allComments comment =
    div [ style "margin-left" "20px", style "margin-top" "10px", style "border-left" "2px solid #eee", style "padding-left" "10px" ]
        [ div [ style "font-weight" "bold", style "font-size" "0.9em" ] [ text comment.authorName ]
        , div [] [ text comment.text ]
        , viewReplyButton model itemId (Just comment.id)
        
        -- Nested Comments (Recursive)
        , div [] (List.map (viewComment model itemId allComments) (filterChildComments comment.id allComments))
        ]

filterChildComments : String -> List Api.Schema.ItemComment -> List Api.Schema.ItemComment
filterChildComments parentId allComments =
    List.filter (\c -> c.parentId == Just parentId) allComments

viewReplyButton : Model -> String -> Maybe String -> Html Msg
viewReplyButton model itemId parentId =
    case model.replyingTo of
        Just activeReply ->
            if activeReply.itemId == itemId && activeReply.parentId == parentId then
                div [ style "margin-top" "5px", style "background" "#f0f0f0", style "padding" "10px" ]
                    [ input 
                        [ placeholder "Your Name (Optional for returning users)"
                        , value model.authorName
                        , onInput SetAuthorName
                        , style "display" "block"
                        , style "margin-bottom" "5px"
                        , style "width" "100%"
                        ] []
                    , textarea 
                        [ placeholder "Write a reply..."
                        , value model.newComment
                        , onInput SetCommentText
                        , style "width" "100%"
                        , style "height" "60px"
                        ] []
                    , div [ style "margin-top" "5px" ]
                        [ button [ onClick PerformSubmitComment, style "margin-right" "5px" ] [ text "Submit" ]
                        , button [ onClick CancelReply ] [ text "Cancel" ]
                        ]
                    ]
            else
                button [ onClick (SetReplyTo itemId parentId), style "font-size" "0.8em", style "color" "gray", style "background" "none", style "border" "none", style "cursor" "pointer", style "text-decoration" "underline" ] [ text "Reply" ]
        
        Nothing ->
            button [ onClick (SetReplyTo itemId parentId), style "font-size" "0.8em", style "color" "gray", style "background" "none", style "border" "none", style "cursor" "pointer", style "text-decoration" "underline" ] [ text "Reply" ]

viewTag : String -> Html Msg
viewTag tag =
    div 
        [ style "display" "inline-block"
        , style "background-color" "#e0e0e0"
        , style "color" "#333"
        , style "padding" "2px 8px"
        , style "border-radius" "12px"
        , style "font-size" "0.85em"
        , style "margin-right" "5px"
        ] 
        [ text tag ]

-- MAIN

main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> init
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }

