module Page.Item exposing
    ( viewSingleItem
    , viewItemDetail
    , viewComment
    , viewReplyForm
    , viewReplyButton
    , viewInlineReplyButton
    , viewEditorToolbar
    )

{-| Item detail page views including comments and reply forms.
-}

import BuildAmp.ApiClient as ApiClient
import Dict
import Html exposing (Html, a, br, button, div, h2, h3, img, section, span, text)
import Html.Attributes exposing (class, href, id, src, style, type_)
import Html.Events exposing (onClick)
import Page.Tag exposing (viewTag)
import Set
import Types exposing (ItemState(..), Model, Msg(..))


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


viewItemDetail : Model -> ApiClient.MicroblogItem -> Html Msg
viewItemDetail model item =
    section [ style "border" "1px solid #ddd", style "padding" "20px", style "border-radius" "8px" ]
        [ h2 [] [ text item.title ]
        , a [ href item.link, style "color" "blue", style "text-decoration" "underline" ] [ text item.link ]
        , div [ style "margin" "15px 0" ]
            [ img [ src item.image, style "max-width" "100%", style "height" "auto" ] [] ]
        , div [ id ("item-extract-" ++ item.id) ] []
        , div [ style "margin-bottom" "15px" ]
            (List.map (viewTag model) item.tags)
        , div [ style "background" "#f9f9f9", style "padding" "15px", style "font-style" "italic", style "border-radius" "5px" ]
            [ text "Owner: ", span [ id ("item-owner-comment-" ++ item.id) ] [] ]

        -- Comments Section
        , div [ style "margin-top" "30px", style "border-top" "2px solid #eee", style "padding-top" "20px" ]
            [ h3 [] [ text "Comments" ]
            , div [] (List.map (viewComment model item.id item.comments 0) (filterRootComments item.comments))
            , viewReplyButton model item.id Nothing
            ]
        ]


filterRootComments : List ApiClient.CommentItem -> List ApiClient.CommentItem
filterRootComments comments =
    List.filter (\c -> c.parentId == Nothing) comments


viewComment : Model -> String -> List ApiClient.CommentItem -> Int -> ApiClient.CommentItem -> Html Msg
viewComment model itemId allComments depth comment =
    let
        children = filterChildComments comment.id allComments
        hasChildren = not (List.isEmpty children)
        isCollapsed = Set.member comment.id model.collapsedComments
        depthClass = "depth-" ++ String.fromInt (modBy 12 depth)
        isRoot = depth == 0
        threadClasses =
            "comment-thread " ++ depthClass
                ++ (if isRoot then " root-comment" else "")
                ++ (if isCollapsed then " collapsed" else "")
    in
    div [ class threadClasses ]
        [ -- Clickable collapse line (not shown for root comments)
          if not isRoot then
            div
                [ class "comment-collapse-line"
                , onClick (ToggleCollapse comment.id)
                ]
                []
          else
            text ""

        -- Comment content
        , div [ class "comment-content" ]
            [ div [ class "comment-author" ] [ text comment.authorName ]
            , if Set.member comment.id model.moderatedComments then
                div [ class "comment-body", style "color" "#999", style "font-style" "italic" ]
                    [ text "[removed by moderation]" ]
              else
                div [ class "comment-body", id ("comment-viewer-" ++ comment.id) ] []
            , div [ class "comment-meta" ]
                [ if hasChildren then
                        span [][
                    button
                        [ class "comment-collapse-toggle-inline"
                        , onClick (ToggleCollapse comment.id)
                        , style "margin-right" "8px"
                        ]
                        [ text (if isCollapsed then "+" else "−") ]
                        , if isCollapsed then
                            span [ style "color" "#888" ]
                                [ text ( "(" ++ String.fromInt (countAllReplies comment.id allComments) ++ ")" ) ]
                          else
                            text ""
                        ]
                  else
                    text ""
                , if isCollapsed then
                        text ""
                  else
                        viewInlineReplyButton model itemId (Just comment.id)
                ]
            , viewReplyForm model itemId (Just comment.id)
            ]

        -- Nested Comments (Recursive) - hidden when collapsed via CSS
        , div [ class "comment-children" ]
            (List.map (viewComment model itemId allComments (depth + 1)) children)
        ]


filterChildComments : String -> List ApiClient.CommentItem -> List ApiClient.CommentItem
filterChildComments parentId allComments =
    List.filter (\c -> c.parentId == Just parentId) allComments


{-| Count all replies (including nested) to a comment -}
countAllReplies : String -> List ApiClient.CommentItem -> Int
countAllReplies parentId allComments =
    let
        directChildren = filterChildComments parentId allComments
        childCount = List.length directChildren
        nestedCount = List.sum (List.map (\c -> countAllReplies c.id allComments) directChildren)
    in
    childCount + nestedCount


{-| Inline reply button shown in comment meta section -}
viewInlineReplyButton : Model -> String -> Maybe String -> Html Msg
viewInlineReplyButton model itemId parentId =
    -- Only show button if we're not already replying to this comment
    case model.replyingTo of
        Just activeReply ->
            if activeReply.itemId == itemId && activeReply.parentId == parentId then
                text ""  -- Hide button when form is shown
            else
                button
                    [ class "comment-reply-btn"
                    , onClick (SetReplyTo itemId parentId)
                    ]
                    [ text "Reply" ]

        Nothing ->
            button
                [ class "comment-reply-btn"
                , onClick (SetReplyTo itemId parentId)
                ]
                [ text "Reply" ]


{-| Reply form shown below comment when user is replying to it -}
viewReplyForm : Model -> String -> Maybe String -> Html Msg
viewReplyForm model itemId parentId =
    case model.replyingTo of
        Just activeReply ->
            if activeReply.itemId == itemId && activeReply.parentId == parentId then
                div [ class "comment-form", style "margin-top" "10px" ]
                    [ div [ style "margin-bottom" "8px", style "font-size" "0.9em", style "color" "#666" ]
                        [ text ("Commenting as: " ++ (Maybe.map .displayName model.guestSession |> Maybe.withDefault "Guest")) ]
                    , div
                        [ id "comment-editor"
                        , class "comment-editor"
                        ]
                        []
                    , div [ style "margin-top" "10px", style "display" "flex", style "gap" "8px" ]
                        [ button
                            [ onClick RequestSubmitComment
                            , class "btn-primary"
                            , style "padding" "8px 16px"
                            , style "background" "#007bff"
                            , style "color" "white"
                            , style "border" "none"
                            , style "border-radius" "4px"
                            , style "cursor" "pointer"
                            ]
                            [ text "Submit" ]
                        , button
                            [ onClick CancelReply
                            , style "padding" "8px 16px"
                            , style "background" "#f0f0f0"
                            , style "border" "1px solid #ccc"
                            , style "border-radius" "4px"
                            , style "cursor" "pointer"
                            ]
                            [ text "Cancel" ]
                        ]
                    ]
            else
                text ""

        Nothing ->
            text ""


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
                div [ class "comment-form", style "margin-top" "10px" ]
                    [ div [ style "margin-bottom" "8px", style "font-size" "0.9em", style "color" "#666" ]
                        [ text ("Commenting as: " ++ (Maybe.map .displayName model.guestSession |> Maybe.withDefault "Guest")) ]
                    , div
                        [ id "comment-editor"
                        , class "comment-editor"
                        ]
                        []
                    , div [ style "margin-top" "10px", style "display" "flex", style "gap" "8px" ]
                        [ button
                            [ onClick RequestSubmitComment
                            , class "btn-primary"
                            , style "padding" "8px 16px"
                            , style "background" "#007bff"
                            , style "color" "white"
                            , style "border" "none"
                            , style "border-radius" "4px"
                            , style "cursor" "pointer"
                            ]
                            [ text "Submit" ]
                        , button
                            [ onClick CancelReply
                            , style "padding" "8px 16px"
                            , style "background" "#f0f0f0"
                            , style "border" "1px solid #ccc"
                            , style "border-radius" "4px"
                            , style "cursor" "pointer"
                            ]
                            [ text "Cancel" ]
                        ]
                    ]
            else
                button [ onClick (SetReplyTo itemId parentId), style "font-size" "0.8em", style "color" "gray", style "background" "none", style "border" "none", style "cursor" "pointer", style "text-decoration" "underline" ] [ text "Respond" ]

        Nothing ->
            div []
                [ br [] []
                , button [ onClick (SetReplyTo itemId parentId), style "font-size" "0.8em", style "color" "gray", style "background" "none", style "border" "none", style "cursor" "pointer", style "text-decoration" "underline" ] [ text action ]
                ]


viewEditorToolbar : Html Msg
viewEditorToolbar =
    div
        [ class "editor-toolbar"
        , style "display" "flex"
        , style "gap" "2px"
        , style "padding" "6px"
        , style "background" "#f5f5f5"
        , style "border" "1px solid #ccc"
        , style "border-radius" "4px 4px 0 0"
        ]
        [ toolbarButton "B" "bold" [ style "font-weight" "bold" ]
        , toolbarButton "I" "italic" [ style "font-style" "italic" ]
        , toolbarButton "</>" "code" [ style "font-family" "monospace", style "font-size" "0.9em" ]
        , toolbarSeparator
        , toolbarButton "link" "link" []
        , toolbarSeparator
        , toolbarButton "bullet" "bulletList" []
        , toolbarButton "quote" "blockquote" []
        ]


toolbarButton : String -> String -> List (Html.Attribute Msg) -> Html Msg
toolbarButton label action extraStyles =
    button
        ([ onClick (EditorCommand action)
         , type_ "button"
         , style "padding" "4px 8px"
         , style "background" "white"
         , style "border" "1px solid #ddd"
         , style "border-radius" "3px"
         , style "cursor" "pointer"
         , style "min-width" "28px"
         ]
            ++ extraStyles
        )
        [ text label ]


toolbarSeparator : Html Msg
toolbarSeparator =
    span [ style "width" "1px", style "background" "#ddd", style "margin" "0 4px" ] []
