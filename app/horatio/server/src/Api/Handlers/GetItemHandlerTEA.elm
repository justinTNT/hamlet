port module Api.Handlers.GetItemHandlerTEA exposing (main)

{-| GetItem Handler - TEA Architecture

This handler implements The Elm Architecture pattern for async request processing.
It demonstrates the req + state + stage pattern for complex async operations.

Business Logic:
- Load a single MicroblogItemDb by ID
- Load all tags and match them to the item through item_tags
- Load comments for that item
- Return a GetItemRes containing a MicroblogItem with all fields filled

-}

import Api.Backend exposing (GetItemReq, GetItemRes)
import Generated.Database as DB
import Generated.Events as Events
import Generated.Services as Services
import Json.Encode as Encode
import Json.Decode as Decode
import Platform
import Task


-- MODEL (req + state + stage)

type alias Model =
    { stage : Stage
    , request : Maybe GetItemReq
    , context : Maybe Context
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    , loadedItem : Maybe DB.MicroblogItemDb
    , allTags : List DB.TagDb
    , itemTags : List DB.ItemTagDb
    , loadedComments : List DB.ItemCommentDb
    }


type Stage
    = Idle
    | LoadingItem
    | LoadingAllTags
    | LoadingItemTags
    | LoadingComments
    | Complete GetItemRes
    | Failed String


type alias Context =
    { host : String
    , userId : Maybe String
    , sessionId : Maybe String
    }


type alias GlobalConfig = DB.GlobalConfig  -- Server-issued read-only config


type alias GlobalState = DB.GlobalState  -- Mutable handler state


-- UPDATE

type Msg
    = HandleRequest RequestBundle
    | ItemLoaded DB.DbResponse
    | AllTagsLoaded DB.DbResponse
    | ItemTagsLoaded DB.DbResponse
    | CommentsLoaded DB.DbResponse


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
      , loadedItem = Nothing
      , allTags = []
      , itemTags = []
      , loadedComments = []
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
                    -- Start the business logic pipeline
                    ( { model 
                      | stage = LoadingItem
                      , request = Just req
                      , context = Just ctx
                      , loadedItem = Nothing
                      , allTags = []
                      , itemTags = []
                      , loadedComments = []
                      }
                    , loadItemById req.id
                    )
                
                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )
        
        ItemLoaded result ->
            if model.stage == LoadingItem then
                case handleDbResponse result of
                    Ok data ->
                        case decodeSingleItem data of
                            Ok (Just item) ->
                                ( { model 
                                  | stage = LoadingAllTags
                                  , loadedItem = Just item 
                                  }
                                , loadAllTags
                                )
                            Ok Nothing ->
                                ( { model | stage = Failed "Item not found" }
                                , complete (encodeError "Item not found")
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
        
        AllTagsLoaded result ->
            if model.stage == LoadingAllTags then
                case handleDbResponse result of
                    Ok data ->
                        case decodeAllTags data of
                            Ok tags ->
                                case model.loadedItem of
                                    Just item ->
                                        ( { model 
                                          | stage = LoadingItemTags
                                          , allTags = tags 
                                          }
                                        , loadItemTagsForItem item.id
                                        )
                                    Nothing ->
                                        ( { model | stage = Failed "No item loaded" }
                                        , complete (encodeError "No item loaded")
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
                                case model.loadedItem of
                                    Just item ->
                                        ( { model 
                                          | stage = LoadingComments
                                          , itemTags = itemTagsList 
                                          }
                                        , loadCommentsForItem item.id
                                        )
                                    Nothing ->
                                        ( { model | stage = Failed "No item loaded" }
                                        , complete (encodeError "No item loaded")
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
        
        CommentsLoaded result ->
            if model.stage == LoadingComments then
                case handleDbResponse result of
                    Ok data ->
                        case decodeComments data of
                            Ok comments ->
                                case model.loadedItem of
                                    Just item ->
                                        let microblogItem = transformToMicroblogItem item model.allTags model.itemTags comments
                                        in
                                        ( { model | stage = Complete { item = microblogItem } }
                                        , complete (encodeGetItemRes { item = microblogItem })
                                        )
                                    Nothing ->
                                        ( { model | stage = Failed "No item loaded" }
                                        , complete (encodeError "No item loaded")
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

{-| Load a specific microblog item by ID
-}
loadItemById : String -> Cmd Msg
loadItemById itemId =
    DB.findMicroblogItems (DB.queryAll |> DB.byId itemId)


{-| Load all tags upfront
-}
loadAllTags : Cmd Msg
loadAllTags =
    DB.findTags DB.queryAll


{-| Load item-tag relationships for a specific item
-}
loadItemTagsForItem : String -> Cmd Msg
loadItemTagsForItem itemId =
    -- Query item_tags junction table for the given item ID
    -- For now, query all item_tags and filter in transformation
    DB.findItemTags DB.queryAll


{-| Load comments for a specific item
-}
loadCommentsForItem : String -> Cmd Msg
loadCommentsForItem itemId =
    -- Query for all comments where item_id matches
    -- For now, query all comments and filter in transformation
    DB.findItemComments DB.queryAll


{-| Handle database response with error checking
-}
handleDbResponse : DB.DbResponse -> Result String Encode.Value
handleDbResponse response =
    if response.success then
        case response.data of
            Just data -> Ok data
            Nothing -> Err "No data returned from database"
    else
        Err (response.error |> Maybe.withDefault "Database query failed")


{-| Decode a single item from the database response
-}
decodeSingleItem : Encode.Value -> Result String (Maybe DB.MicroblogItemDb)
decodeSingleItem data =
    case Decode.decodeValue (Decode.list microblogItemDbDecoder) data of
        Ok items -> 
            case List.head items of
                Just item -> Ok (Just item)
                Nothing -> Ok Nothing
        Err error -> Err ("Failed to decode item: " ++ Decode.errorToString error)


{-| Decode all tags
-}
decodeAllTags : Encode.Value -> Result String (List DB.TagDb)
decodeAllTags data =
    case Decode.decodeValue (Decode.list DB.tagDbDecoder) data of
        Ok tags -> Ok tags
        Err error -> Err ("Failed to decode tags: " ++ Decode.errorToString error)


{-| Decode item-tag junction table data
-}
decodeItemTags : Encode.Value -> Result String (List DB.ItemTagDb)
decodeItemTags data =
    case Decode.decodeValue (Decode.list DB.itemtagDbDecoder) data of
        Ok itemTags -> Ok itemTags
        Err error -> Err ("Failed to decode item tags: " ++ Decode.errorToString error)


{-| Decode comments from JSON
-}
decodeComments : Encode.Value -> Result String (List DB.ItemCommentDb)
decodeComments data =
    case Decode.decodeValue (Decode.list DB.itemcommentDbDecoder) data of
        Ok comments -> Ok comments
        Err error -> Err ("Failed to decode comments: " ++ Decode.errorToString error)


{-| Transform a MicroblogItemDb with all its relations to the API MicroblogItem format
-}
transformToMicroblogItem : DB.MicroblogItemDb -> List DB.TagDb -> List DB.ItemTagDb -> List DB.ItemCommentDb -> Api.Backend.MicroblogItem
transformToMicroblogItem dbItem allTags itemTags comments =
    let
        -- Filter item tags for this specific item
        thisItemTags = List.filter (\it -> it.itemId == dbItem.id) itemTags
        
        -- Get the tag IDs for this item
        tagIds = List.map .tagId thisItemTags
        
        -- Find the actual tag names from allTags
        itemTagNames = 
            allTags
                |> List.filter (\tag -> List.member tag.id tagIds)
                |> List.map .name
        
        -- Filter comments for this specific item
        itemComments = 
            comments
                |> List.filter (\comment -> comment.itemId == dbItem.id)
                |> List.map transformCommentToApi
    in
    { id = dbItem.id
    , title = dbItem.data.title
    , link = dbItem.data.link |> Maybe.withDefault ""
    , image = dbItem.data.image |> Maybe.withDefault ""
    , extract = dbItem.data.extract |> Maybe.withDefault ""
    , ownerComment = dbItem.data.ownerComment
    , tags = itemTagNames
    , comments = itemComments
    , timestamp = dbItem.createdAt
    }


{-| Transform a database comment to API format
-}
transformCommentToApi : DB.ItemCommentDb -> Api.Backend.CommentItem
transformCommentToApi dbComment =
    { id = dbComment.id
    , itemId = dbComment.itemId
    , guestId = dbComment.guestId
    , parentId = dbComment.parentId
    , authorName = dbComment.authorName
    , text = dbComment.text
    , timestamp = dbComment.createdAt
    }


{-| Custom decoder for MicroblogItemDb that handles bigint timestamps as strings
-}
microblogItemDbDecoder : Decode.Decoder DB.MicroblogItemDb
microblogItemDbDecoder =
    Decode.succeed DB.MicroblogItemDb
        |> andMap (Decode.field "id" Decode.string)
        |> andMap (Decode.field "data" DB.microblogitemdataDbDecoder)
        |> andMap (Decode.field "created_at" timestampDecoder)
        |> andMap (Decode.field "view_count" Decode.int)


{-| Decoder that handles timestamps as either strings (from BIGINT) or ints
-}
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


-- Helper for pipeline-style decoding
andMap : Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
andMap = Decode.map2 (|>)


-- DECODING

decodeRequest : RequestBundle -> Result String ( GetItemReq, Context )
decodeRequest bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue Api.Backend.getItemReqDecoder bundle.request |> Result.mapError Decode.errorToString)
        (Decode.decodeValue contextDecoder bundle.context |> Result.mapError Decode.errorToString)


contextDecoder : Decode.Decoder Context
contextDecoder =
    Decode.map3 Context
        (Decode.field "host" Decode.string)
        (Decode.maybe (Decode.field "userId" Decode.string))
        (Decode.maybe (Decode.field "sessionId" Decode.string))


-- ENCODING

encodeGetItemRes : GetItemRes -> Encode.Value
encodeGetItemRes response =
    Api.Backend.getItemResEncoder response


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
subscriptions model =
    Sub.batch
        [ handleRequest HandleRequest
        , DB.dbResult ItemLoaded
        , DB.dbResult AllTagsLoaded
        , DB.dbResult ItemTagsLoaded
        , DB.dbResult CommentsLoaded
        ]
