port module Main exposing (main)

import Api
import Api.Http
import Api.Schema
import Browser
import Browser.Navigation as Nav
import Html exposing (Html, button, div, h1, h2, h3, h4, p, a, img, text, section, input, textarea, label, span, br)
import Html.Attributes exposing (src, href, style, class, value, placeholder)
import Html.Events exposing (onClick, onInput, onMouseEnter, onMouseLeave)
import Http
import Random
import Storage
import Url
import Dict exposing (Dict)
import Task

port log : String -> Cmd msg

-- MODEL

type alias Model =
    { feed : FeedState
    , replyingTo : Maybe { itemId : String, parentId : Maybe String }
    , newComment : String
    , guestSession : Maybe GuestSession
    , route : Route
    , navKey : Nav.Key
    , hoveredItem : Maybe String
    , itemDetails : Dict String ItemState
    }

type ItemState
    = ItemLoading
    | ItemLoaded Api.Schema.MicroblogItem
    | ItemFailed String

type Route
    = Feed
    | Item String  -- Item ID

type alias GuestSession = Storage.GuestSession

type FeedState
    = Loading
    | LoadedFeed (List Api.Schema.FeedItem)
    | Errored String

init : () -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init _ url key =
    let
        route = parseUrl url
    in
    let
        initialCmd = case route of
            Feed ->
                getFeed
            Item itemId ->
                Task.perform (always (LoadItem itemId)) (Task.succeed ())
    in
    ( { feed = Loading
      , replyingTo = Nothing
      , newComment = ""
      , guestSession = Nothing
      , route = route
      , navKey = key
      , hoveredItem = Nothing
      , itemDetails = Dict.empty
      }
    , Cmd.batch [ initialCmd, Storage.loadGuestSession () ]
    )

parseUrl : Url.Url -> Route
parseUrl url =
    case url.path of
        "/" ->
            Feed
            
        path ->
            if String.startsWith "/item/" path then
                Item (String.dropLeft 6 path)
            else
                Feed

-- GUEST SESSION MANAGEMENT

createGuestSession : Cmd Msg
createGuestSession =
    Random.generate
        (\randomInt ->
            GuestSessionCreated
                { guest_id = "guest-" ++ String.fromInt randomInt
                , display_name = "Guest" ++ String.fromInt (modBy 1000 randomInt)
                , created_at = 0  -- Will be set by server timestamp later
                }
        )
        (Random.int 1 9999)

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
                , authorName = Maybe.map .display_name model.guestSession
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
    | PerformSubmitComment
    | SubmittedComment (Result Http.Error Api.Schema.SubmitCommentRes)
    | CancelReply
    | GuestSessionCreated GuestSession
    | GuestSessionLoaded (Maybe GuestSession)
    | LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | SetHoverState (Maybe String)
    | LoadItem String
    | GotItem String (Result Http.Error Api.Schema.GetItemRes)

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

        GuestSessionCreated session ->
            ( { model | guestSession = Just session }, Storage.saveGuestSession session )
        
        GuestSessionLoaded maybeSession ->
            case maybeSession of
                Just session ->
                    ( { model | guestSession = Just session }, Cmd.none )
                
                Nothing ->
                    -- No existing session, create a new one
                    ( model, createGuestSession )

        PerformSubmitComment ->
            ( model, submitComment model )

        SubmittedComment (Ok _) ->
            ( { model | replyingTo = Nothing, newComment = "", feed = Loading }, getFeed ) -- Refresh feed to show new comment

        SubmittedComment (Err err) ->
            ( { model | feed = Errored ("Failed to submit comment: " ++ httpErrorToString err) }, Cmd.none )

        CancelReply ->
            ( { model | replyingTo = Nothing, newComment = "" }, Cmd.none )
            
        LinkClicked urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.navKey (Url.toString url) )
                
                Browser.External href ->
                    ( model, Nav.load href )
        
        UrlChanged url ->
            let
                newRoute = parseUrl url
                loadCmd = case newRoute of
                    Item itemId ->
                        if Dict.member itemId model.itemDetails then
                            Cmd.none
                        else
                            Task.perform (always (LoadItem itemId)) (Task.succeed ())
                    _ ->
                        Cmd.none
            in
            ( { model | route = newRoute }, loadCmd )
            
        SetHoverState itemId ->
            ( { model | hoveredItem = itemId }, Cmd.none )
            
        LoadItem itemId ->
            ( { model | itemDetails = Dict.insert itemId ItemLoading model.itemDetails }
            , Api.getItem { host = "localhost", id = itemId }
                |> Api.Http.send (GotItem itemId)
            )
            
        GotItem itemId (Ok res) ->
            ( { model | itemDetails = Dict.insert itemId (ItemLoaded res.item) model.itemDetails }
            , Cmd.none
            )
            
        GotItem itemId (Err _) ->
            ( { model | itemDetails = Dict.insert itemId (ItemFailed "Could not load item details") model.itemDetails }
            , Cmd.none
            )

httpErrorToString : Http.Error -> String
httpErrorToString err =
    case err of
        Http.BadUrl url -> "Bad Url: " ++ url
        Http.Timeout -> "Timeout"
        Http.NetworkError -> "Network Error"
        Http.BadStatus status -> "Bad Status: " ++ String.fromInt status
        Http.BadBody body -> "Bad Body: " ++ body

-- VIEW

view : Model -> Browser.Document Msg
view model =
    { title = "Horatio Reader"
    , body = 
        [ div [ style "font-family" "sans-serif", style "max-width" "800px", style "margin" "0 auto", style "padding" "20px" ]
            [ h1 [] [ a [ href "/", style "text-decoration" "none", style "color" "black" ] [ text "Horatio Reader" ] ]
            , div [ style "margin-bottom" "20px", style "display" "flex", style "justify-content" "space-between", style "align-items" "center" ]
                [ button [ onClick PerformSubmitItem ] [ text "Test: Submit Item" ]
                , span [ style "font-size" "0.9em", style "color" "#666" ]
                    [ text ("Signed in as: " ++ (Maybe.map .display_name model.guestSession |> Maybe.withDefault "Loading...")) ]
                ]
            , viewContent model
            ]
        ]
    }

viewContent : Model -> Html Msg
viewContent model =
    case model.route of
        Feed ->
            viewFeed model
            
        Item itemId ->
            viewSingleItem model itemId

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

viewSingleItem : Model -> String -> Html Msg
viewSingleItem model itemId =
    case Dict.get itemId model.itemDetails of
        Just ItemLoading ->
            div [] [ text "Loading item details..." ]
            
        Just (ItemLoaded item) ->
            viewItemDetail model item
            
        Just (ItemFailed error) ->
            div [ style "color" "red" ] [ text error ]
            
        Nothing ->
            div [] [ text "Loading item details..." ]

viewFeedItem : Model -> Api.Schema.FeedItem -> Html Msg
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
                        p [ style "color" "#333" ] [ text extractText ]
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
                [ text item.ownerComment ]
            ]
        ]

countUserComments : List Api.Schema.ItemComment -> String
countUserComments comments =
    let
        userComments = List.filter (\c -> c.authorName /= "Guest") comments
    in
    String.fromInt (List.length userComments)

viewItemDetail : Model -> Api.Schema.MicroblogItem -> Html Msg
viewItemDetail model item =
    section [ style "border" "1px solid #ddd", style "padding" "20px", style "border-radius" "8px" ]
        [ h2 [] [ text item.title ]
        , a [ href item.link, style "color" "blue", style "text-decoration" "underline" ] [ text item.link ]
        , div [ style "margin" "15px 0" ] 
            [ img [ src item.image, style "max-width" "100%", style "height" "auto" ] [] ]
        , p [] [ text item.extract ]
        , div [ style "margin-bottom" "15px" ]
            (List.map viewTag item.tags)
        , div [ style "background" "#f9f9f9", style "padding" "15px", style "font-style" "italic", style "border-radius" "5px" ]
            [ text ("Owner: " ++ item.ownerComment) ]
        
        -- Comments Section
        , div [ style "margin-top" "30px", style "border-top" "2px solid #eee", style "padding-top" "20px" ]
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
    let
        action =
            case parentId of
                Just _ -> "Reply"
                Nothing -> "Leave a comment"
    in
    case model.replyingTo of
        Just activeReply ->
            if activeReply.itemId == itemId && activeReply.parentId == parentId then
                div [ style "margin-top" "5px", style "background" "#f0f0f0", style "padding" "10px" ]
                    [ div [ style "margin-bottom" "5px", style "font-size" "0.9em", style "color" "#666" ]
                        [ text ("Commenting as: " ++ (Maybe.map .display_name model.guestSession |> Maybe.withDefault "Guest")) ]
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
                button [ onClick (SetReplyTo itemId parentId), style "font-size" "0.8em", style "color" "gray", style "background" "none", style "border" "none", style "cursor" "pointer", style "text-decoration" "underline" ] [ text "Respond" ]
        
        Nothing ->
            div []
                [ br [] [],
                button [ onClick (SetReplyTo itemId parentId), style "font-size" "0.8em", style "color" "gray", style "background" "none", style "border" "none", style "cursor" "pointer", style "text-decoration" "underline" ] [ text action ]
                ]

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
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged
        , onUrlRequest = LinkClicked
        }


subscriptions : Model -> Sub Msg
subscriptions _ =
    Storage.onGuestSessionLoaded GuestSessionLoaded

