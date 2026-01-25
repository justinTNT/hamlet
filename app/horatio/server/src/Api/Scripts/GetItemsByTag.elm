module Api.Scripts.GetItemsByTag exposing (handler, decodeRequest, encodeResponse)

{-| GetItemsByTag Handler - Script version

Returns feed items filtered by a specific tag.
Flow: LoadTags → LoadItems → LoadItemTags → Filter → Transform → Complete

-}

import Backend.Runtime exposing (Context)
import Backend.Script as Script exposing (Script)
import BuildAmp.Api exposing (FeedItem, GetItemsByTagReq, GetItemsByTagRes)
import BuildAmp.Database as DB
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias GlobalConfig =
    { serverNow : Int
    , hostIsolation : Bool
    , environment : String
    }


{-| The handler - filters items by tag -}
handler : GetItemsByTagReq -> Context -> GlobalConfig -> Script GetItemsByTagRes
handler req ctx config =
    Script.dbFind "tag" Script.queryAll
        |> Script.andThenDecode (Decode.list DB.tagDbDecoder)
            (\allTags ->
                Script.dbFind "microblog_item" (Script.queryAll |> Script.sortByDesc "created_at")
                    |> Script.andThenDecode (Decode.list DB.microblogitemDbDecoder)
                        (\items ->
                            Script.dbFind "item_tag" Script.queryAll
                                |> Script.andThenDecode (Decode.list DB.itemtagDbDecoder)
                                    (\itemTags ->
                                        Script.succeed
                                            { tag = req.tag
                                            , items = filterItemsByTag req.tag items allTags itemTags
                                            }
                                    )
                        )
            )


{-| Filter items that have the specified tag -}
filterItemsByTag : String -> List DB.MicroblogItemDb -> List DB.TagDb -> List DB.ItemTagDb -> List FeedItem
filterItemsByTag tagName items allTags itemTags =
    let
        maybeTagId =
            allTags
                |> List.filter (\t -> t.name == tagName)
                |> List.head
                |> Maybe.map .id
    in
    case maybeTagId of
        Just tagId ->
            let
                itemIdsWithTag =
                    itemTags
                        |> List.filter (\it -> it.tagId == tagId)
                        |> List.map .itemId
            in
            items
                |> List.filter (\item -> List.member item.id itemIdsWithTag)
                |> List.map toFeedItem

        Nothing ->
            []


{-| Transform DB item to FeedItem -}
toFeedItem : DB.MicroblogItemDb -> FeedItem
toFeedItem dbItem =
    { id = dbItem.id
    , title = dbItem.title
    , image = dbItem.image
    , extract = dbItem.extract
    , ownerComment = dbItem.ownerComment
    , timestamp = dbItem.createdAt
    }



-- DECODERS/ENCODERS for Runtime


decodeRequest : Decoder GetItemsByTagReq
decodeRequest =
    BuildAmp.Api.getItemsByTagReqDecoder


encodeResponse : GetItemsByTagRes -> Encode.Value
encodeResponse =
    BuildAmp.Api.getItemsByTagResEncoder
