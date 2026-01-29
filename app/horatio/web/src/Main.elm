port module Main exposing (main)

{-| Main entry point for the Horatio web app.

This module handles routing, initialization, update logic, and subscriptions.
View functions are delegated to Page modules.
-}

import Browser
import Browser.Navigation as Nav
import BuildAmp.ApiClient as ApiClient
import BuildAmp.Config exposing (GlobalConfig)
import BuildAmp.ServerSentEvents as SSE
import Dict
import Html exposing (Html, a, button, div, h1, span, text)
import Html.Attributes exposing (href, style)
import Html.Events exposing (onClick)
import Http
import Json.Decode as Decode
import Json.Encode as Encode
import Page.Feed exposing (viewFeed)
import Page.Item exposing (viewSingleItem)
import Page.Tag exposing (viewTagPage)
import Process
import Random
import Set
import Storage
import Task
import Types exposing (..)
import Url


-- PORTS

port log : String -> Cmd msg

-- Tiptap editor ports
port initCommentEditor : String -> Cmd msg
port getCommentEditorContent : () -> Cmd msg
port commentEditorContent : (String -> msg) -> Sub msg
port clearCommentEditor : () -> Cmd msg
port commentEditorCommand : Encode.Value -> Cmd msg
port destroyCommentEditor : () -> Cmd msg

-- Rich text viewer ports
port initRichTextViewers : List { elementId : String, content : Encode.Value } -> Cmd msg
port destroyRichTextViewers : List String -> Cmd msg

-- SSE ports for real-time updates
port sseEvent : (Encode.Value -> msg) -> Sub msg


-- INIT

init : GlobalConfig -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init config url key =
    let
        route = parseUrl url
        initialCmd = case route of
            Feed ->
                getFeed
            Item itemId ->
                Task.perform (always (LoadItem itemId)) (Task.succeed ())
            Tag tagName ->
                Task.perform (always (LoadTagItems tagName)) (Task.succeed ())
    in
    ( { config = config
      , feed = Loading
      , replyingTo = Nothing
      , newComment = ""
      , guestSession = Nothing
      , route = route
      , navKey = key
      , hoveredItem = Nothing
      , itemDetails = Dict.empty
      , tagItems = Dict.empty
      , collapsedComments = Set.empty
      , moderatedComments = Set.empty
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
                { guestId = "guest-" ++ String.fromInt randomInt
                , displayName = "Guest" ++ String.fromInt (modBy 1000 randomInt)
                , createdAt = 0
                }
        )
        (Random.int 1 9999)


-- API CALLS

getFeed : Cmd Msg
getFeed =
    ApiClient.getfeed {} GotFeed


submitItem : Cmd Msg
submitItem =
    ApiClient.submititem
        { title = "New Item from Elm"
        , link = "https://elm-lang.org"
        , image = "https://placehold.co/100x100"
        , extract = plainTextToRichContent "This item was submitted via the generated Elm API."
        , owner_comment = plainTextToRichContent "So much cleaner!"
        , tags = []
        }
        SubmittedItem


{-| Wrap plain text as a TipTap document JSON value. -}
plainTextToRichContent : String -> Encode.Value
plainTextToRichContent str =
    Encode.object
        [ ( "type", Encode.string "doc" )
        , ( "content"
          , Encode.list identity
                [ Encode.object
                    [ ( "type", Encode.string "paragraph" )
                    , ( "content"
                      , Encode.list identity
                            [ Encode.object
                                [ ( "type", Encode.string "text" )
                                , ( "text", Encode.string str )
                                ]
                            ]
                      )
                    ]
                ]
          )
        ]


submitComment : Model -> Cmd Msg
submitComment model =
    case model.replyingTo of
        Just { itemId, parentId } ->
            ApiClient.submitcomment
                { item_id = itemId
                , parent_id = parentId
                , text = model.newComment
                , author_name = Maybe.map .displayName model.guestSession
                }
                SubmittedComment

        Nothing ->
            Cmd.none


submitCommentWithContent : Model -> String -> Cmd Msg
submitCommentWithContent model content =
    case model.replyingTo of
        Just { itemId, parentId } ->
            ApiClient.submitcomment
                { item_id = itemId
                , parent_id = parentId
                , text = content
                , author_name = Maybe.map .displayName model.guestSession
                }
                SubmittedComment

        Nothing ->
            Cmd.none


-- UPDATE

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PerformSubmitItem ->
            ( model, submitItem )

        GotFeed (Ok res) ->
            ( { model | feed = LoadedFeed res.items }, Cmd.none )

        GotFeed (Err err) ->
            ( { model | feed = Errored ("Failed to fetch feed: " ++ httpErrorToString err) }, Cmd.none )

        SubmittedItem (Ok _) ->
            ( { model | feed = Loading }, getFeed )

        SubmittedItem (Err err) ->
            ( { model | feed = Errored ("Failed to submit item: " ++ httpErrorToString err) }, Cmd.none )

        SetReplyTo itemId parentId ->
            ( { model | replyingTo = Just { itemId = itemId, parentId = parentId }, newComment = "" }
            , initCommentEditor "comment-editor"
            )

        SetCommentText text ->
            ( { model | newComment = text }, Cmd.none )

        GuestSessionCreated session ->
            ( { model | guestSession = Just session }, Storage.saveGuestSession session )

        GuestSessionLoaded maybeSession ->
            case maybeSession of
                Just session ->
                    ( { model | guestSession = Just session }, Cmd.none )

                Nothing ->
                    ( model, createGuestSession )

        PerformSubmitComment ->
            ( model, submitComment model )

        SubmittedComment (Ok _) ->
            ( { model | replyingTo = Nothing, newComment = "", feed = Loading }
            , Cmd.batch [ getFeed, destroyCommentEditor () ]
            )

        SubmittedComment (Err err) ->
            ( { model | feed = Errored ("Failed to submit comment: " ++ httpErrorToString err) }, Cmd.none )

        CancelReply ->
            ( { model | replyingTo = Nothing, newComment = "" }, destroyCommentEditor () )

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
                        case model.feed of
                            LoadedFeed _ -> Cmd.none
                            _ -> getFeed
            in
            ( { model | route = newRoute }, loadCmd )

        SetHoverState itemId ->
            ( { model | hoveredItem = itemId }, Cmd.none )

        LoadItem itemId ->
            ( { model | itemDetails = Dict.insert itemId ItemLoading model.itemDetails }
            , ApiClient.getitem { id = itemId } (GotItem itemId)
            )

        GotItem itemId (Ok res) ->
            ( { model | itemDetails = Dict.insert itemId (ItemLoaded res.item) model.itemDetails }
            , scheduleViewerInit itemId
            )

        GotItem itemId (Err _) ->
            ( { model | itemDetails = Dict.insert itemId (ItemFailed "Could not load item details") model.itemDetails }
            , Cmd.none
            )

        LoadTagItems tagName ->
            ( { model | tagItems = Dict.insert tagName TagItemsLoading model.tagItems }
            , ApiClient.getitemsbytag { tag = tagName } (GotTagItems tagName)
            )

        GotTagItems tagName (Ok res) ->
            ( { model | tagItems = Dict.insert tagName (TagItemsLoaded res.items) model.tagItems }
            , Cmd.none
            )

        GotTagItems tagName (Err _) ->
            ( { model | tagItems = Dict.insert tagName (TagItemsFailed "Could not load items for this tag") model.tagItems }
            , Cmd.none
            )

        EditorCommand action ->
            ( model
            , commentEditorCommand (Encode.object [ ( "action", Encode.string action ) ])
            )

        EditorLinkPrompt ->
            ( model
            , commentEditorCommand
                (Encode.object
                    [ ( "action", Encode.string "link" )
                    , ( "url", Encode.string "" )
                    ]
                )
            )

        GotEditorContent jsonContent ->
            if String.isEmpty jsonContent then
                ( model, Cmd.none )
            else
                ( { model | newComment = jsonContent }
                , submitCommentWithContent model jsonContent
                )

        RequestSubmitComment ->
            ( model, getCommentEditorContent () )

        ToggleCollapse commentId ->
            let
                newCollapsed =
                    if Set.member commentId model.collapsedComments then
                        Set.remove commentId model.collapsedComments
                    else
                        Set.insert commentId model.collapsedComments
            in
            ( { model | collapsedComments = newCollapsed }, Cmd.none )

        ReceivedSseEvent eventJson ->
            case Decode.decodeValue sseEventDecoder eventJson of
                Ok (NewCommentSseEvent sseComment) ->
                    let
                        comment = sseEventToComment sseComment
                        updatedItemDetails =
                            Dict.map
                                (\_ itemState ->
                                    case itemState of
                                        ItemLoaded item ->
                                            if item.id == comment.itemId then
                                                ItemLoaded { item | comments = item.comments ++ [ comment ] }
                                            else
                                                itemState
                                        _ ->
                                            itemState
                                )
                                model.itemDetails
                        viewerCmd =
                            Process.sleep 50
                                |> Task.perform (always (InitViewersForItem comment.itemId))
                    in
                    ( { model | itemDetails = updatedItemDetails }, viewerCmd )

                Ok (CommentModeratedSseEvent data) ->
                    let
                        newModeratedComments =
                            if data.removed then
                                Set.insert data.commentId model.moderatedComments
                            else
                                Set.remove data.commentId model.moderatedComments
                    in
                    ( { model | moderatedComments = newModeratedComments }
                    , log ("Comment moderated: " ++ data.commentId ++ " removed=" ++ (if data.removed then "true" else "false"))
                    )

                Ok (UnknownSseEvent eventType) ->
                    ( model, log ("Unknown SSE event: " ++ eventType) )

                Err _ ->
                    ( model, Cmd.none )

        InitViewersForItem itemId ->
            case Dict.get itemId model.itemDetails of
                Just (ItemLoaded item) ->
                    let
                        commentViewers =
                            item.comments
                                |> List.map (\c -> { elementId = "comment-viewer-" ++ c.id, content = c.text })

                        extractViewer =
                            [ { elementId = "item-extract-" ++ itemId, content = item.extract } ]

                        ownerCommentViewer =
                            [ { elementId = "item-owner-comment-" ++ itemId, content = item.ownerComment } ]

                        allViewers =
                            extractViewer ++ ownerCommentViewer ++ commentViewers
                    in
                    ( model, initRichTextViewers allViewers )

                _ ->
                    ( model, Cmd.none )


httpErrorToString : Http.Error -> String
httpErrorToString err =
    case err of
        Http.BadUrl url -> "Bad Url: " ++ url
        Http.Timeout -> "Timeout"
        Http.NetworkError -> "Network Error"
        Http.BadStatus status -> "Bad Status: " ++ String.fromInt status
        Http.BadBody body -> "Bad Body: " ++ body


scheduleViewerInit : String -> Cmd Msg
scheduleViewerInit itemId =
    Process.sleep 50
        |> Task.perform (always (InitViewersForItem itemId))


-- SSE EVENT HANDLING

type SseEvent
    = NewCommentSseEvent SSE.NewCommentEvent
    | CommentModeratedSseEvent SSE.CommentModeratedEvent
    | UnknownSseEvent String


sseEventDecoder : Decode.Decoder SseEvent
sseEventDecoder =
    Decode.field "type" Decode.string
        |> Decode.andThen (\eventType ->
            case eventType of
                "new_comment_event" ->
                    Decode.field "data" SSE.decodeNewCommentEvent
                        |> Decode.map NewCommentSseEvent

                "comment_moderated" ->
                    Decode.field "data" SSE.decodeCommentModeratedEvent
                        |> Decode.map CommentModeratedSseEvent

                _ ->
                    Decode.succeed (UnknownSseEvent eventType)
        )


sseEventToComment : SSE.NewCommentEvent -> ApiClient.CommentItem
sseEventToComment evt =
    { id = evt.id
    , itemId = evt.itemId
    , guestId = evt.guestId
    , parentId = evt.parentId
    , authorName = evt.authorName
    , text = evt.text
    , timestamp = evt.timestamp
    }


-- VIEW

view : Model -> Browser.Document Msg
view model =
    { title = "Horatio Reader"
    , body =
        [ div [ style "font-family" "sans-serif", style "max-width" "800px", style "margin" "0 auto", style "padding" "20px" ]
            [ h1 [] [ a [ href "/", style "text-decoration" "none", style "color" "red" ] [ text model.config.siteName ] ]
            , div [ style "margin-bottom" "20px", style "display" "flex", style "justify-content" "space-between", style "align-items" "center" ]
                [ button [ onClick PerformSubmitItem ] [ text "Test: Submit Item" ]
                , span [ style "font-size" "0.9em", style "color" "#666" ]
                    [ text ("Signed in as: " ++ (Maybe.map .displayName model.guestSession |> Maybe.withDefault "Loading...")) ]
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


-- MAIN

main : Program GlobalConfig Model Msg
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
    Sub.batch
        [ Storage.onGuestSessionLoaded GuestSessionLoaded
        , commentEditorContent GotEditorContent
        , sseEvent ReceivedSseEvent
        ]
