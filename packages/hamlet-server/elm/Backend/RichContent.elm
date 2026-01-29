module Backend.RichContent exposing
    ( fromPlainText
    , fromPlainTextMaybe
    , fromText
    , fromTextMaybe
    , empty
    )

{-| Utilities for working with TipTap RichContent (JSONB).

RichContent is stored as JSONB in PostgreSQL using TipTap's document format.
These utilities help create RichContent values from plain text for database insertion.

@docs fromPlainText, fromPlainTextMaybe, fromText, empty

-}

import Json.Decode as Decode
import Json.Encode as Encode


{-| Convert plain text to TipTap RichContent format.

    fromPlainText "Hello world"
    --> { "type": "doc", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Hello world" }] }] }

-}
fromPlainText : String -> Encode.Value
fromPlainText text =
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
                                , ( "text", Encode.string text )
                                ]
                            ]
                      )
                    ]
                ]
          )
        ]


{-| Convert plain text to RichContent, returning Nothing for empty strings.

Useful for optional RichContent fields where empty string means "no content".

    fromPlainTextMaybe "" --> Nothing
    fromPlainTextMaybe "Hello" --> Just (fromPlainText "Hello")

-}
fromPlainTextMaybe : String -> Maybe Encode.Value
fromPlainTextMaybe text =
    if String.isEmpty (String.trim text) then
        Nothing

    else
        Just (fromPlainText text)


{-| Convert text that might already be RichContent JSON.

If the text starts with `{"type":"doc"`, parse it as JSON.
Otherwise, wrap plain text in RichContent format.

This is useful when the frontend might send either raw RichContent
(from TipTap editor) or plain text.

-}
fromText : String -> Encode.Value
fromText text =
    if String.startsWith "{\"type\":\"doc\"" text then
        -- Already RichContent - parse and use directly
        case Decode.decodeString Decode.value text of
            Ok jsonValue ->
                jsonValue

            Err _ ->
                -- Failed to parse, treat as plain text
                fromPlainText text

    else
        fromPlainText text


{-| Like fromText, but returns Nothing for empty strings.

    fromTextMaybe "" --> Nothing
    fromTextMaybe "{\"type\":\"doc\"...}" --> Just (parsed JSON)
    fromTextMaybe "Hello" --> Just (fromPlainText "Hello")

-}
fromTextMaybe : String -> Maybe Encode.Value
fromTextMaybe text =
    if String.isEmpty (String.trim text) then
        Nothing

    else
        Just (fromText text)


{-| An empty TipTap document.

    empty
    --> { "type": "doc", "content": [] }

-}
empty : Encode.Value
empty =
    Encode.object
        [ ( "type", Encode.string "doc" )
        , ( "content", Encode.list identity [] )
        ]
