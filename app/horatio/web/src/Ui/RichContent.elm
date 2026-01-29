module Ui.RichContent exposing
    ( RichContentDoc
    , RichContentNode(..)
    , RichContentInline(..)
    , RichContentMark(..)
    , viewRichContent
    , extractRichContentText
    )

{-| Hand-written module for rendering TipTap rich content JSON.

This provides a lightweight Elm renderer for TipTap JSON content.
For full fidelity (colors, alignment), use TipTap viewers via ports instead.
-}

import Html exposing (Html, h1, h2, h3, h4, p, a, span, text)
import Html.Attributes
import Json.Decode as Decode
import Json.Encode as Encode


-- RICH CONTENT TYPES

type alias RichContentDoc =
    { docType : String
    , content : List RichContentNode
    }

type RichContentNode
    = ParagraphNode (List RichContentInline)
    | HeadingNode Int (List RichContentInline)
    | BulletListNode (List RichContentNode)
    | OrderedListNode (List RichContentNode)
    | ListItemNode (List RichContentNode)
    | BlockquoteNode (List RichContentNode)

type RichContentInline
    = TextNode String (List RichContentMark)

type RichContentMark
    = BoldMark
    | ItalicMark
    | CodeMark
    | LinkMark String


-- RICH CONTENT DECODERS

richContentDocDecoder : Decode.Decoder RichContentDoc
richContentDocDecoder =
    Decode.map2 RichContentDoc
        (Decode.field "type" Decode.string)
        (Decode.field "content" (Decode.list richContentNodeDecoder))

richContentNodeDecoder : Decode.Decoder RichContentNode
richContentNodeDecoder =
    Decode.field "type" Decode.string
        |> Decode.andThen (\nodeType ->
            case nodeType of
                "paragraph" ->
                    Decode.map ParagraphNode
                        (Decode.oneOf
                            [ Decode.field "content" (Decode.list richContentInlineDecoder)
                            , Decode.succeed []
                            ]
                        )

                "heading" ->
                    Decode.map2 HeadingNode
                        (Decode.at ["attrs", "level"] Decode.int)
                        (Decode.oneOf
                            [ Decode.field "content" (Decode.list richContentInlineDecoder)
                            , Decode.succeed []
                            ]
                        )

                "bulletList" ->
                    Decode.map BulletListNode
                        (Decode.field "content" (Decode.list (Decode.lazy (\_ -> richContentNodeDecoder))))

                "orderedList" ->
                    Decode.map OrderedListNode
                        (Decode.field "content" (Decode.list (Decode.lazy (\_ -> richContentNodeDecoder))))

                "listItem" ->
                    Decode.map ListItemNode
                        (Decode.field "content" (Decode.list (Decode.lazy (\_ -> richContentNodeDecoder))))

                "blockquote" ->
                    Decode.map BlockquoteNode
                        (Decode.field "content" (Decode.list (Decode.lazy (\_ -> richContentNodeDecoder))))

                _ ->
                    -- Fallback: treat unknown as empty paragraph
                    Decode.succeed (ParagraphNode [])
        )

richContentInlineDecoder : Decode.Decoder RichContentInline
richContentInlineDecoder =
    Decode.oneOf
        [ -- Text node with optional marks
          Decode.map2 TextNode
            (Decode.field "text" Decode.string)
            (Decode.oneOf
                [ Decode.field "marks" (Decode.list richContentMarkDecoder)
                    |> Decode.map (List.filterMap identity)
                , Decode.succeed []
                ]
            )
        , -- Hard break -> newline
          Decode.field "type" Decode.string
            |> Decode.andThen (\t ->
                if t == "hardBreak" then
                    Decode.succeed (TextNode "\n" [])
                else
                    Decode.fail "not a hardBreak"
            )
        , -- Fallback for other inline nodes
          Decode.succeed (TextNode "" [])
        ]

richContentMarkDecoder : Decode.Decoder (Maybe RichContentMark)
richContentMarkDecoder =
    Decode.field "type" Decode.string
        |> Decode.andThen (\markType ->
            case markType of
                "bold" -> Decode.succeed (Just BoldMark)
                "italic" -> Decode.succeed (Just ItalicMark)
                "code" -> Decode.succeed (Just CodeMark)
                "link" ->
                    Decode.oneOf
                        [ Decode.map (\href -> Just (LinkMark href)) (Decode.at ["attrs", "href"] Decode.string)
                        , Decode.succeed Nothing  -- Skip if href missing
                        ]
                _ -> Decode.succeed Nothing  -- Skip unknown marks
        )

decodeRichContentDoc : Encode.Value -> Maybe RichContentDoc
decodeRichContentDoc value =
    case Decode.decodeValue richContentDocDecoder value of
        Ok doc -> Just doc
        Err _ -> Nothing


-- RICH CONTENT RENDERING

viewRichContent : Encode.Value -> Html msg
viewRichContent value =
    case decodeRichContentDoc value of
        Just doc ->
            span [] (List.map viewRichContentNode doc.content)
        Nothing ->
            text ""

viewRichContentNode : RichContentNode -> Html msg
viewRichContentNode node =
    case node of
        ParagraphNode inlines ->
            p [] (List.map viewRichContentInline inlines)

        HeadingNode level inlines ->
            let
                headingTag = case level of
                    1 -> h1
                    2 -> h2
                    3 -> h3
                    4 -> h4
                    _ -> h4
            in
            headingTag [] (List.map viewRichContentInline inlines)

        BulletListNode items ->
            Html.ul [] (List.map viewRichContentNode items)

        OrderedListNode items ->
            Html.ol [] (List.map viewRichContentNode items)

        ListItemNode content ->
            Html.li [] (List.map viewRichContentNode content)

        BlockquoteNode content ->
            Html.blockquote [] (List.map viewRichContentNode content)

viewRichContentInline : RichContentInline -> Html msg
viewRichContentInline inline =
    case inline of
        TextNode txt marks ->
            List.foldl applyMark (text txt) marks

applyMark : RichContentMark -> Html msg -> Html msg
applyMark mark content =
    case mark of
        BoldMark -> Html.strong [] [ content ]
        ItalicMark -> Html.em [] [ content ]
        CodeMark -> Html.code [] [ content ]
        LinkMark href -> a [ Html.Attributes.href href ] [ content ]


-- TEXT EXTRACTION

extractRichContentText : Encode.Value -> String
extractRichContentText value =
    case decodeRichContentDoc value of
        Just doc ->
            doc.content
                |> List.map extractNodeText
                |> String.join " "
        Nothing ->
            ""

extractNodeText : RichContentNode -> String
extractNodeText node =
    case node of
        ParagraphNode inlines ->
            List.map extractInlineText inlines |> String.join ""

        HeadingNode _ inlines ->
            List.map extractInlineText inlines |> String.join ""

        BulletListNode items ->
            List.map extractNodeText items |> String.join " "

        OrderedListNode items ->
            List.map extractNodeText items |> String.join " "

        ListItemNode content ->
            List.map extractNodeText content |> String.join " "

        BlockquoteNode content ->
            List.map extractNodeText content |> String.join " "

extractInlineText : RichContentInline -> String
extractInlineText inline =
    case inline of
        TextNode txt _ -> txt
