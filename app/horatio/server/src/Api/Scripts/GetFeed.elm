module Api.Scripts.GetFeed exposing (handler, decodeRequest, encodeResponse)

{-| GetFeed Handler - Script version

Retrieves feed of microblog items (simplified view without tags/comments).
Flow: LoadItems → Transform → Complete

-}

import Backend.Runtime exposing (Context)
import Backend.Script as Script exposing (Script)
import BuildAmp.Api exposing (FeedItem, GetFeedReq, GetFeedRes)
import BuildAmp.Database as DB
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias GlobalConfig =
    { serverNow : Int
    , hostIsolation : Bool
    , environment : String
    }


{-| The handler - loads items and transforms to feed format -}
handler : GetFeedReq -> Context -> GlobalConfig -> Script GetFeedRes
handler req ctx config =
    Script.dbFind "microblog_item" (Script.queryAll |> Script.sortByDesc "created_at")
        |> Script.andThenDecode (Decode.list DB.microblogitemDbDecoder)
            (\items ->
                Script.succeed { items = List.map toFeedItem items }
            )


{-| Transform DB item to FeedItem (simplified view) -}
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


decodeRequest : Decoder GetFeedReq
decodeRequest =
    BuildAmp.Api.getFeedReqDecoder


encodeResponse : GetFeedRes -> Encode.Value
encodeResponse =
    BuildAmp.Api.getFeedResEncoder
