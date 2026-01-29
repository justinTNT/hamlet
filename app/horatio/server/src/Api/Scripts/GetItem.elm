module Api.Scripts.GetItem exposing (handler, decodeRequest, encodeResponse)

{-| GetItem Handler - Script version

Retrieves a single microblog item with all details (tags, comments).
Flow: LoadItem → LoadTags → LoadItemTags → LoadComments → Transform → Complete

-}

import Backend.RichContent as RichContent
import Backend.Runtime exposing (Context)
import Backend.Script as Script exposing (Script)
import BuildAmp.Api exposing (CommentItem, GetItemReq, GetItemRes, MicroblogItem)
import BuildAmp.Database as DB
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias GlobalConfig =
    { serverNow : Int
    , hostIsolation : Bool
    , environment : String
    }


{-| The handler - loads item with all related data -}
handler : GetItemReq -> Context -> GlobalConfig -> Script GetItemRes
handler req ctx config =
    Script.dbFind "microblog_item" (Script.queryById req.id)
        |> Script.andThenDecode (Decode.list DB.microblogitemDbDecoder)
            (\items ->
                case List.head items of
                    Nothing ->
                        Script.fail "Item not found"

                    Just dbItem ->
                        Script.dbFind "tag" Script.queryAll
                            |> Script.andThenDecode (Decode.list DB.tagDbDecoder)
                                (\allTags ->
                                    Script.dbFind "item_tag" Script.queryAll
                                        |> Script.andThenDecode (Decode.list DB.itemtagDbDecoder)
                                            (\itemTags ->
                                                Script.dbFind "item_comment" Script.queryAll
                                                    |> Script.andThenDecode (Decode.list DB.itemcommentDbDecoder)
                                                        (\comments ->
                                                            Script.succeed
                                                                { item = toMicroblogItem dbItem allTags itemTags comments }
                                                        )
                                            )
                                )
            )


{-| Transform DB item with relations to API MicroblogItem -}
toMicroblogItem : DB.MicroblogItemDb -> List DB.TagDb -> List DB.ItemTagDb -> List DB.ItemCommentDb -> MicroblogItem
toMicroblogItem dbItem allTags itemTags comments =
    let
        thisItemTags =
            List.filter (\it -> it.itemId == dbItem.id) itemTags

        tagIds =
            List.map .tagId thisItemTags

        itemTagNames =
            allTags
                |> List.filter (\tag -> List.member tag.id tagIds)
                |> List.map .name

        itemComments =
            comments
                |> List.filter (\comment -> comment.itemId == dbItem.id)
                |> List.map toCommentItem
    in
    { id = dbItem.id
    , title = dbItem.title
    , link = dbItem.link |> Maybe.withDefault ""
    , image = dbItem.image |> Maybe.withDefault ""
    , extract = dbItem.extract |> Maybe.withDefault RichContent.empty
    , ownerComment = dbItem.ownerComment
    , tags = itemTagNames
    , comments = itemComments
    , timestamp = dbItem.createdAt
    }


{-| Transform DB comment to API format -}
toCommentItem : DB.ItemCommentDb -> CommentItem
toCommentItem dbComment =
    { id = dbComment.id
    , itemId = dbComment.itemId
    , guestId = dbComment.guestId
    , parentId = dbComment.parentId
    , authorName = dbComment.authorName
    , text =
        if dbComment.removed then
            RichContent.fromPlainText "[removed by moderation]"
        else
            dbComment.text
    , timestamp = dbComment.createdAt
    }



-- DECODERS/ENCODERS for Runtime


decodeRequest : Decoder GetItemReq
decodeRequest =
    BuildAmp.Api.getItemReqDecoder


encodeResponse : GetItemRes -> Encode.Value
encodeResponse =
    BuildAmp.Api.getItemResEncoder
