module Api.Scripts.GetTags exposing (handler, decodeRequest, encodeResponse)

{-| GetTags Handler - Script version

Retrieves all tag names for the current host.
Flow: LoadTags → ExtractNames → Complete

-}

import Backend.Runtime exposing (Context)
import Backend.Script as Script exposing (Script)
import BuildAmp.Api exposing (GetTagsReq, GetTagsRes)
import BuildAmp.Database as DB
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias GlobalConfig =
    { serverNow : Int
    , hostIsolation : Bool
    , environment : String
    }


{-| The handler - loads tags and returns names -}
handler : GetTagsReq -> Context -> GlobalConfig -> Script GetTagsRes
handler req ctx config =
    Script.dbFind "tag" Script.queryAll
        |> Script.andThenDecode (Decode.list DB.tagDbDecoder)
            (\tags ->
                Script.succeed { tags = List.map .name tags }
            )



-- DECODERS/ENCODERS for Runtime


decodeRequest : Decoder GetTagsReq
decodeRequest =
    BuildAmp.Api.getTagsReqDecoder


encodeResponse : GetTagsRes -> Encode.Value
encodeResponse =
    BuildAmp.Api.getTagsResEncoder
