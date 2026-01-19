port module Api.Handlers.SubmitItemHandlerTEA exposing (main)

{-| SubmitItem Handler - TEA Architecture

Creates a new microblog item with tags.
Multi-stage: CreateItem → LoadTags → CreateMissingTags → LinkTags → Complete

-}

import Api.Backend exposing (SubmitItemReq, SubmitItemRes, MicroblogItem)
import Generated.Database as DB
import Json.Encode as Encode
import Json.Decode as Decode
import Platform
import Task


-- MODEL

type alias Model =
    { stage : Stage
    , request : Maybe SubmitItemReq
    , context : Maybe Context
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    , createdItemId : Maybe String
    , existingTags : List DB.TagDb
    , tagsToCreate : List String
    , createdTagIds : List String
    }


type Stage
    = Idle
    | CreatingItem
    | LoadingTags
    | CreatingTags
    | LinkingTags
    | Complete SubmitItemRes
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
    | ItemCreated DB.DbResponse
    | TagsLoaded DB.DbResponse
    | TagCreated DB.DbResponse
    | TagLinked DB.DbResponse


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
      , createdItemId = Nothing
      , existingTags = []
      , tagsToCreate = []
      , createdTagIds = []
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
                    let
                        itemId = String.fromInt model.globalConfig.serverNow
                    in
                    ( { model
                      | stage = CreatingItem
                      , request = Just req
                      , context = Just ctx
                      , createdItemId = Just itemId
                      }
                    , createMicroblogItem itemId req model.globalConfig.serverNow
                    )

                Err error ->
                    ( { model | stage = Failed error }
                    , complete (encodeError error)
                    )

        ItemCreated result ->
            if model.stage == CreatingItem then
                case handleDbResponse result of
                    Ok _ ->
                        -- Item created successfully, now load tags
                        ( { model | stage = LoadingTags }
                        , loadTags
                        )
                    Err error ->
                        ( { model | stage = Failed error }
                        , complete (encodeError error)
                        )
            else
                ( model, Cmd.none )

        TagsLoaded result ->
            if model.stage /= LoadingTags then
                ( model, Cmd.none )
            else
            case model.request of
                Just req ->
                    case handleDbResponse result of
                        Ok data ->
                            case Decode.decodeValue (Decode.list DB.tagDbDecoder) data of
                                Ok tags ->
                                    let
                                        existingNames = List.map .name tags
                                        tagsToCreate = List.filter (\t -> not (List.member t existingNames)) req.tags
                                    in
                                    if List.isEmpty tagsToCreate then
                                        -- All tags exist, link them
                                        let
                                            tagIds = getTagIdsForNames req.tags tags
                                        in
                                        if List.isEmpty tagIds then
                                            -- No tags at all, complete immediately
                                            completeWithItem model req
                                        else
                                            ( { model
                                              | stage = LinkingTags
                                              , existingTags = tags
                                              , createdTagIds = tagIds
                                              }
                                            , linkTagsToItem model.createdItemId tagIds
                                            )
                                    else
                                        -- Need to create some tags first
                                        ( { model
                                          | stage = CreatingTags
                                          , existingTags = tags
                                          , tagsToCreate = tagsToCreate
                                          }
                                        , createNextTag model.context tagsToCreate
                                        )
                                Err err ->
                                    ( { model | stage = Failed (Decode.errorToString err) }
                                    , complete (encodeError (Decode.errorToString err))
                                    )
                        Err error ->
                            ( { model | stage = Failed error }
                            , complete (encodeError error)
                            )
                Nothing ->
                    ( { model | stage = Failed "No request in model" }
                    , complete (encodeError "No request in model")
                    )

        TagCreated result ->
            if model.stage /= CreatingTags then
                ( model, Cmd.none )
            else
            case handleDbResponse result of
                Ok data ->
                    case Decode.decodeValue (Decode.field "id" Decode.string) data of
                        Ok tagId ->
                            let
                                newCreatedIds = model.createdTagIds ++ [tagId]
                                remainingTags = List.drop 1 model.tagsToCreate
                            in
                            if List.isEmpty remainingTags then
                                -- All tags created, now link them all
                                case model.request of
                                    Just req ->
                                        let
                                            existingTagIds = getTagIdsForNames req.tags model.existingTags
                                            allTagIds = existingTagIds ++ newCreatedIds
                                        in
                                        ( { model
                                          | stage = LinkingTags
                                          , createdTagIds = allTagIds
                                          , tagsToCreate = []
                                          }
                                        , linkTagsToItem model.createdItemId allTagIds
                                        )
                                    Nothing ->
                                        ( { model | stage = Failed "No request" }
                                        , complete (encodeError "No request")
                                        )
                            else
                                -- More tags to create
                                ( { model
                                  | createdTagIds = newCreatedIds
                                  , tagsToCreate = remainingTags
                                  }
                                , createNextTag model.context remainingTags
                                )
                        Err err ->
                            ( { model | stage = Failed (Decode.errorToString err) }
                            , complete (encodeError (Decode.errorToString err))
                            )
                Err error ->
                    ( { model | stage = Failed error }
                    , complete (encodeError error)
                    )

        TagLinked result ->
            if model.stage /= LinkingTags then
                ( model, Cmd.none )
            else
            -- Check if more tags to link
            let
                remainingTagIds = List.drop 1 model.createdTagIds
            in
            if List.isEmpty remainingTagIds then
                -- All done, return the created item
                case model.request of
                    Just req ->
                        completeWithItem model req
                    Nothing ->
                        ( { model | stage = Failed "Missing request" }
                        , complete (encodeError "Missing request")
                        )
            else
                -- More tags to link
                ( { model | createdTagIds = remainingTagIds }
                , linkTagsToItem model.createdItemId remainingTagIds
                )


-- BUSINESS LOGIC

{-| Complete the request and return the created item
-}
completeWithItem : Model -> SubmitItemReq -> ( Model, Cmd Msg )
completeWithItem model req =
    case model.createdItemId of
        Just itemId ->
            let
                item : MicroblogItem
                item =
                    { id = itemId
                    , title = req.title
                    , link = req.link
                    , image = req.image
                    , extract = req.extract
                    , ownerComment = req.ownerComment
                    , tags = req.tags
                    , comments = []
                    , timestamp = model.globalConfig.serverNow
                    }
                response = { item = item }
            in
            ( { model | stage = Complete response }
            , complete (encodeSubmitItemRes response)
            )
        Nothing ->
            ( { model | stage = Failed "Missing item ID" }
            , complete (encodeError "Missing item ID")
            )


createMicroblogItem : String -> SubmitItemReq -> Int -> Cmd Msg
createMicroblogItem itemId req timestamp =
    let
        -- Encode fields matching the flat database schema
        -- Optional fields encoded as null if empty
        encodeOptional str =
            if String.isEmpty str then
                Encode.null
            else
                Encode.string str

        data =
            Encode.object
                [ ( "id", Encode.string itemId )
                , ( "title", Encode.string req.title )
                , ( "link", encodeOptional req.link )
                , ( "image", encodeOptional req.image )
                , ( "extract", encodeOptional req.extract )
                , ( "owner_comment", Encode.string req.ownerComment )
                , ( "created_at", Encode.int timestamp )
                , ( "view_count", Encode.int 0 )
                ]
    in
    DB.dbCreate
        { id = "create_item"
        , table = "microblog_item"
        , data = data
        }


loadTags : Cmd Msg
loadTags =
    DB.findTags DB.queryAll


createNextTag : Maybe Context -> List String -> Cmd Msg
createNextTag maybeCtx tags =
    case ( maybeCtx, List.head tags ) of
        ( Just _, Just tagName ) ->
            DB.dbCreate
                { id = "create_tag_" ++ tagName
                , table = "tag"
                , data = DB.encodeTagDbCreate { name = tagName }
                }
        _ ->
            Cmd.none


linkTagsToItem : Maybe String -> List String -> Cmd Msg
linkTagsToItem maybeItemId tagIds =
    case ( maybeItemId, List.head tagIds ) of
        ( Just itemId, Just tagId ) ->
            DB.dbCreate
                { id = "link_tag_" ++ tagId
                , table = "item_tag"
                , data = DB.encodeItemTagDbCreate { itemId = itemId, tagId = tagId }
                }
        _ ->
            Cmd.none


getTagIdsForNames : List String -> List DB.TagDb -> List String
getTagIdsForNames names tags =
    List.filterMap
        (\name ->
            tags
                |> List.filter (\t -> t.name == name)
                |> List.head
                |> Maybe.map .id
        )
        names


handleDbResponse : DB.DbResponse -> Result String Encode.Value
handleDbResponse response =
    if response.success then
        case response.data of
            Just data -> Ok data
            Nothing -> Err "No data returned from database"
    else
        Err (response.error |> Maybe.withDefault "Database operation failed")


-- DECODING

decodeRequest : RequestBundle -> Result String ( SubmitItemReq, Context )
decodeRequest bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue Api.Backend.submitItemReqDecoder bundle.request |> Result.mapError Decode.errorToString)
        (Decode.decodeValue contextDecoder bundle.context |> Result.mapError Decode.errorToString)


contextDecoder : Decode.Decoder Context
contextDecoder =
    Decode.map3 Context
        (Decode.field "host" Decode.string)
        (Decode.maybe (Decode.field "userId" Decode.string))
        (Decode.maybe (Decode.field "sessionId" Decode.string))


-- ENCODING

encodeSubmitItemRes : SubmitItemRes -> Encode.Value
encodeSubmitItemRes response =
    Api.Backend.submitItemResEncoder response


encodeError : String -> Encode.Value
encodeError error =
    Encode.object
        [ ("error", Encode.string error)
        ]


-- PORTS

port handleRequest : (RequestBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg


-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ handleRequest HandleRequest
        , DB.dbResult ItemCreated
        , DB.dbResult TagsLoaded
        , DB.dbResult TagCreated
        , DB.dbResult TagLinked
        ]


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = update
        , subscriptions = subscriptions
        }
