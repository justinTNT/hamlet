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
    , hoveredTag : Maybe String
    , itemDetails : Dict String ItemState
    , tagItems : Dict String TagItemsState
    }

type TagItemsState
    = TagItemsLoading
    | TagItemsLoaded (List Api.Schema.FeedItem)
    | TagItemsFailed String

type ItemState
    = ItemLoading
    | ItemLoaded Api.Schema.MicroblogItem
    | ItemFailed String

type Route
    = Feed
    | Item String  -- Item ID
    | Tag String   -- Tag name

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
            Tag tagName ->
                Task.perform (always (LoadTagItems tagName)) (Task.succeed ())
    in
    ( { feed = Loading
      , replyingTo = Nothing
      , newComment = ""
      , guestSession = Nothing
      , route = route
      , navKey = key
      , hoveredItem = Nothing
      , hoveredTag = Nothing
      , itemDetails = Dict.empty
      , tagItems = Dict.empty
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
            else if String.startsWith "/tag/" path then
                Tag (String.dropLeft 5 path |> Url.percentDecode |> Maybe.withDefault "")
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
    | SetTagHoverState (Maybe String)
    | LoadItem String
    | GotItem String (Result Http.Error Api.Schema.GetItemRes)
    | LoadTagItems String
    | GotTagItems String (Result Http.Error Api.Schema.GetItemsByTagRes)

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
                    Tag tagName ->
                        if Dict.member tagName model.tagItems then
                            Cmd.none
                        else
                            Task.perform (always (LoadTagItems tagName)) (Task.succeed ())
                    Feed ->
                        Cmd.none
            in
            ( { model | route = newRoute }, loadCmd )
            
        SetHoverState itemId ->
            ( { model | hoveredItem = itemId }, Cmd.none )

        SetTagHoverState tagName ->
            ( { model | hoveredTag = tagName }, Cmd.none )

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

        LoadTagItems tagName ->
            ( { model | tagItems = Dict.insert tagName TagItemsLoading model.tagItems }
            , Api.getItemsByTag { host = "localhost", tag = tagName }
                |> Api.Http.send (GotTagItems tagName)
            )

        GotTagItems tagName (Ok res) ->
            ( { model | tagItems = Dict.insert tagName (TagItemsLoaded res.items) model.tagItems }
            , Cmd.none
            )

        GotTagItems tagName (Err _) ->
            ( { model | tagItems = Dict.insert tagName (TagItemsFailed "Could not load items for this tag") model.tagItems }
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

        Tag tagName ->
            viewTagPage model tagName

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

countUserComments : List Api.Schema.CommentItem -> String
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
            (List.map (viewTag model) item.tags)
        , div [ style "background" "#f9f9f9", style "padding" "15px", style "font-style" "italic", style "border-radius" "5px" ]
            [ text ("Owner: " ++ item.ownerComment) ]
        
        -- Comments Section
        , div [ style "margin-top" "30px", style "border-top" "2px solid #eee", style "padding-top" "20px" ]
            [ h3 [] [ text "Comments" ]
            , div [] (List.map (viewComment model item.id item.comments) (filterRootComments item.comments))
            , viewReplyButton model item.id Nothing
            ]
        ]

filterRootComments : List Api.Schema.CommentItem -> List Api.Schema.CommentItem
filterRootComments comments =
    List.filter (\c -> c.parentId == Nothing) comments

viewComment : Model -> String -> List Api.Schema.CommentItem -> Api.Schema.CommentItem -> Html Msg
viewComment model itemId allComments comment =
    div [ style "margin-left" "20px", style "margin-top" "10px", style "border-left" "2px solid #eee", style "padding-left" "10px" ]
        [ div [ style "font-weight" "bold", style "font-size" "0.9em" ] [ text comment.authorName ]
        , div [] [ text comment.text ]
        , viewReplyButton model itemId (Just comment.id)
        
        -- Nested Comments (Recursive)
        , div [] (List.map (viewComment model itemId allComments) (filterChildComments comment.id allComments))
        ]

filterChildComments : String -> List Api.Schema.CommentItem -> List Api.Schema.CommentItem
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

viewTag : Model -> String -> Html Msg
viewTag model tag =
    let
        isHovered = model.hoveredTag == Just tag
        baseColor = tagColor tag
        backgroundColor = if isHovered then darkenColor baseColor else baseColor
    in
    a
        [ href ("/tag/" ++ Url.percentEncode tag)
        , style "display" "inline-block"
        , style "background-color" backgroundColor
        , style "color" "white"
        , style "padding" "4px 12px"
        , style "border-radius" "16px"
        , style "font-size" "0.85em"
        , style "margin-right" "8px"
        , style "margin-bottom" "6px"
        , style "text-decoration" "none"
        , style "transition" "background-color 0.2s, transform 0.1s"
        , style "transform" (if isHovered then "scale(1.05)" else "scale(1)")
        , onMouseEnter (SetTagHoverState (Just tag))
        , onMouseLeave (SetTagHoverState Nothing)
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


{-| Darken a hex color for hover effect
-}
darkenColor : String -> String
darkenColor color =
    -- Simple approach: use predefined darker versions
    case color of
        "#e74c3c" -> "#c0392b"
        "#3498db" -> "#2980b9"
        "#2ecc71" -> "#27ae60"
        "#9b59b6" -> "#8e44ad"
        "#f39c12" -> "#d68910"
        "#1abc9c" -> "#16a085"
        "#e91e63" -> "#c2185b"
        "#00bcd4" -> "#0097a7"
        _ -> "#555"

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

