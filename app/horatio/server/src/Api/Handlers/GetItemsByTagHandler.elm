port module Api.Handlers.GetItemsByTagHandler exposing (main)

{-| GetItemsByTag Handler

Returns feed items filtered by a specific tag.

-}

import BuildAmp.Api exposing (GetItemsByTagReq, GetItemsByTagRes, FeedItem)
import BuildAmp.Database as DB
import Json.Encode as Encode
import Json.Decode as Decode
import Platform


-- MODEL (req + state + stage)

type alias Model =
    { stage : Stage
    , request : Maybe GetItemsByTagReq
    , context : Maybe Context
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    , loadedItems : List DB.MicroblogItemDb
    , allTags : List DB.TagDb
    , itemTags : List DB.ItemTagDb
    }


type Stage
    = Idle
    | LoadingAllTags
    | LoadingItems
    | LoadingItemTags
    | Complete GetItemsByTagRes
    | Failed String


type alias Context =
    { host : String
    , userId : Maybe String
    , sessionId : Maybe String
    }


type alias GlobalConfig = DB.GlobalConfig


type alias GlobalState = DB.GlobalState


-- UPDATE

type Msg
    = HandleRequest RequestBundle
    | AllTagsLoaded DB.DbResponse
    | ItemsLoaded DB.DbResponse
    | ItemTagsLoaded DB.DbResponse


type alias RequestBundle =
    { request : Encode.Value
    , context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , request = Nothing
      , context = Nothing
      , globalConfig = flags.globalConfig
      , globalState = flags.globalState
      , loadedItems = []
      , allTags = []
      , itemTags = []
      }
    , Cmd.none
    )


type alias Flags =
    { globalConfig : GlobalConfig
    , globalState : GlobalState
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        HandleRequest bundle ->
            case decodeRequest bundle of
                Ok ( req, ctx ) ->
                    ( { model
                      | stage = LoadingAllTags
                      , request = Just req
                      , context = Just ctx
                      , loadedItems = []
                      , allTags = []
                      , itemTags = []
                      }
                    , loadAllTags
                    )

                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )

        AllTagsLoaded result ->
            if model.stage == LoadingAllTags then
                case handleDbResponse result of
                    Ok data ->
                        case decodeAllTags data of
                            Ok tags ->
                                ( { model
                                  | stage = LoadingItems
                                  , allTags = tags
                                  }
                                , loadMicroblogItems
                                )
                            Err error ->
                                ( { model | stage = Failed error }
                                , complete (encodeError error)
                                )
                    Err error ->
                        ( { model | stage = Failed error }
                        , complete (encodeError error)
                        )
            else
                ( model, Cmd.none )

        ItemsLoaded result ->
            if model.stage == LoadingItems then
                case handleDbResponse result of
                    Ok data ->
                        case decodeItems data of
                            Ok items ->
                                ( { model
                                  | stage = LoadingItemTags
                                  , loadedItems = items
                                  }
                                , loadItemTags
                                )
                            Err error ->
                                ( { model | stage = Failed error }
                                , complete (encodeError error)
                                )
                    Err error ->
                        ( { model | stage = Failed error }
                        , complete (encodeError error)
                        )
            else
                ( model, Cmd.none )

        ItemTagsLoaded result ->
            if model.stage == LoadingItemTags then
                case handleDbResponse result of
                    Ok data ->
                        case decodeItemTags data of
                            Ok itemTagsList ->
                                case model.request of
                                    Just req ->
                                        let
                                            filteredItems = filterItemsByTag req.tag model.loadedItems model.allTags itemTagsList
                                            response = { tag = req.tag, items = filteredItems }
                                        in
                                        ( { model | stage = Complete response }
                                        , complete (encodeGetItemsByTagRes response)
                                        )
                                    Nothing ->
                                        ( { model | stage = Failed "No request found" }
                                        , complete (encodeError "No request found")
                                        )
                            Err error ->
                                ( { model | stage = Failed error }
                                , complete (encodeError error)
                                )
                    Err error ->
                        ( { model | stage = Failed error }
                        , complete (encodeError error)
                        )
            else
                ( model, Cmd.none )


-- BUSINESS LOGIC

loadAllTags : Cmd Msg
loadAllTags =
    DB.findTags DB.queryAll


loadMicroblogItems : Cmd Msg
loadMicroblogItems =
    DB.findMicroblogItems (DB.queryAll |> DB.sortByCreatedAt)


loadItemTags : Cmd Msg
loadItemTags =
    DB.findItemTags DB.queryAll


{-| Filter items that have the specified tag
-}
filterItemsByTag : String -> List DB.MicroblogItemDb -> List DB.TagDb -> List DB.ItemTagDb -> List FeedItem
filterItemsByTag tagName items allTags itemTags =
    -- Find the tag ID for the given tag name
    let
        maybeTagId =
            allTags
                |> List.filter (\t -> t.name == tagName)
                |> List.head
                |> Maybe.map .id
    in
    case maybeTagId of
        Just tagId ->
            -- Get all item IDs that have this tag
            let
                itemIdsWithTag =
                    itemTags
                        |> List.filter (\it -> it.tagId == tagId)
                        |> List.map .itemId
            in
            -- Filter items and transform to FeedItem
            items
                |> List.filter (\item -> List.member item.id itemIdsWithTag)
                |> List.map transformToFeedItem

        Nothing ->
            -- Tag not found, return empty list
            []


transformToFeedItem : DB.MicroblogItemDb -> FeedItem
transformToFeedItem dbItem =
    { id = dbItem.id
    , title = dbItem.title
    , image = dbItem.image
    , extract = dbItem.extract
    , ownerComment = dbItem.ownerComment
    , timestamp = dbItem.createdAt
    }


handleDbResponse : DB.DbResponse -> Result String Encode.Value
handleDbResponse response =
    if response.success then
        case response.data of
            Just data -> Ok data
            Nothing -> Err "No data returned from database"
    else
        Err (response.error |> Maybe.withDefault "Database query failed")


decodeAllTags : Encode.Value -> Result String (List DB.TagDb)
decodeAllTags data =
    case Decode.decodeValue (Decode.list DB.tagDbDecoder) data of
        Ok tags -> Ok tags
        Err error -> Err ("Failed to decode tags: " ++ Decode.errorToString error)


decodeItems : Encode.Value -> Result String (List DB.MicroblogItemDb)
decodeItems data =
    case Decode.decodeValue (Decode.list microblogItemDbDecoder) data of
        Ok items -> Ok items
        Err error -> Err ("Failed to decode items: " ++ Decode.errorToString error)


decodeItemTags : Encode.Value -> Result String (List DB.ItemTagDb)
decodeItemTags data =
    case Decode.decodeValue (Decode.list DB.itemtagDbDecoder) data of
        Ok itemTags -> Ok itemTags
        Err error -> Err ("Failed to decode item tags: " ++ Decode.errorToString error)


{-| Use generated decoder for MicroblogItemDb (handles flat structure and timestamps)
-}
microblogItemDbDecoder : Decode.Decoder DB.MicroblogItemDb
microblogItemDbDecoder =
    DB.microblogitemDbDecoder


timestampDecoder : Decode.Decoder Int
timestampDecoder =
    Decode.oneOf
        [ Decode.int
        , Decode.string |> Decode.andThen stringToInt
        ]


stringToInt : String -> Decode.Decoder Int
stringToInt str =
    case String.toInt str of
        Just int -> Decode.succeed int
        Nothing -> Decode.fail ("Could not parse timestamp: " ++ str)


andMap : Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
andMap = Decode.map2 (|>)


-- DECODING

decodeRequest : RequestBundle -> Result String ( GetItemsByTagReq, Context )
decodeRequest bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue BuildAmp.Api.getItemsByTagReqDecoder bundle.request |> Result.mapError Decode.errorToString)
        (Decode.decodeValue contextDecoder bundle.context |> Result.mapError Decode.errorToString)


contextDecoder : Decode.Decoder Context
contextDecoder =
    Decode.map3 Context
        (Decode.field "host" Decode.string)
        (Decode.maybe (Decode.field "userId" Decode.string))
        (Decode.maybe (Decode.field "sessionId" Decode.string))


-- ENCODING

encodeGetItemsByTagRes : GetItemsByTagRes -> Encode.Value
encodeGetItemsByTagRes response =
    BuildAmp.Api.getItemsByTagResEncoder response


encodeError : String -> Encode.Value
encodeError error =
    Encode.object
        [ ("error", Encode.string error)
        ]


-- PORTS (TEA Pattern)

port handleRequest : (RequestBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = update
        , subscriptions = subscriptions
        }


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ handleRequest HandleRequest
        , DB.dbResult AllTagsLoaded
        , DB.dbResult ItemsLoaded
        , DB.dbResult ItemTagsLoaded
        ]
