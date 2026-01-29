module Api.Scripts.SubmitComment exposing (handler, decodeRequest, encodeResponse)

{-| SubmitComment Handler - Script version

Submits a new comment on a microblog item.
Flow: CreateComment → Broadcast → Complete

-}

import Backend.RichContent as RichContent
import Backend.Runtime exposing (Context)
import Backend.Script as Script exposing (Script)
import BuildAmp.Api exposing (CommentItem, SubmitCommentReq, SubmitCommentRes)
import BuildAmp.Database as DB
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias GlobalConfig =
    { serverNow : Int
    , hostIsolation : Bool
    , environment : String
    }


{-| The handler - creates comment and broadcasts event -}
handler : SubmitCommentReq -> Context -> GlobalConfig -> Script SubmitCommentRes
handler req ctx config =
    let
        -- Prepare comment data
        guestId =
            Maybe.withDefault "guest_anonymous" req.authorName

        authorName =
            Maybe.withDefault "Anonymous" req.authorName

        commentData =
            Encode.object
                [ ( "item_id", Encode.string req.itemId )
                , ( "guest_id", Encode.string guestId )
                , ( "parent_id", encodeMaybeString req.parentId )
                , ( "author_name", Encode.string authorName )
                , ( "text", RichContent.fromText req.text )
                ]
    in
    -- Step 1: Create the comment
    Script.dbCreate "item_comment" commentData
        |> Script.andThenDecode (Decode.field "id" Decode.string)
            (\commentId ->
                let
                    apiComment =
                        { id = commentId
                        , itemId = req.itemId
                        , guestId = guestId
                        , parentId = req.parentId
                        , authorName = authorName
                        , text = RichContent.fromText req.text
                        , timestamp = config.serverNow
                        }
                in
                -- Step 2: Broadcast the new comment event
                Script.broadcast "new_comment_event" (BuildAmp.Api.commentItemEncoder apiComment)
                    |> Script.andThen
                        (\_ ->
                            -- Step 3: Return response
                            Script.succeed { comment = apiComment }
                        )
            )


{-| Encode Maybe String as JSON -}
encodeMaybeString : Maybe String -> Encode.Value
encodeMaybeString maybeStr =
    case maybeStr of
        Just str ->
            Encode.string str

        Nothing ->
            Encode.null



-- DECODERS/ENCODERS for Runtime


decodeRequest : Decoder SubmitCommentReq
decodeRequest =
    BuildAmp.Api.submitCommentReqDecoder


encodeResponse : SubmitCommentRes -> Encode.Value
encodeResponse =
    BuildAmp.Api.submitCommentResEncoder
