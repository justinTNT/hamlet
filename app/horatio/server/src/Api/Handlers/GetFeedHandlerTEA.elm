port module Api.Handlers.GetFeedHandlerTEA exposing (main)

{-| GetFeed Handler - TEA Architecture

This handler implements The Elm Architecture pattern for async request processing.
It demonstrates the req + state + stage pattern for complex async operations.

Business Logic:
- Query microblog items for the given host
- Fetch associated comments and tags
- Combine and format the response

-}

import Api.Backend exposing (GetFeedReq, GetFeedRes, MicroblogItem, Comment)
import Generated.Database as DB
import Json.Encode as Encode
import Json.Decode as Decode
import Platform
import Task


-- MODEL (req + state + stage)

type alias Model =
    { stage : Stage
    , request : Maybe GetFeedReq  
    , context : Maybe Context
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    , dbItems : List DB.MicroblogItemDb  -- Database entities
    , dbComments : List DB.ItemCommentDb  -- Database comment entities
    , tags : List Tag  -- TODO: Create TagDb type
    }


type Stage
    = Idle
    | LoadingItems
    | LoadingComments (List DB.MicroblogItemDb)  -- Database entities
    | LoadingTags (List DB.MicroblogItemDb) (List DB.ItemCommentDb)  -- Database entities
    | Complete GetFeedRes  -- API response


type alias Context =
    { host : String
    , userId : Maybe String
    , sessionId : Maybe String
    }


type alias GlobalConfig = DB.GlobalConfig  -- Read-only server config


type alias GlobalState = DB.GlobalState  -- Mutable handler state


-- TODO: Define TagDb type in Generated.Database
type alias Tag =
    { itemId : String
    , name : String
    }


-- UPDATE

type Msg
    = HandleRequest RequestBundle
    | ItemsLoaded (Result String (List DB.MicroblogItemDb))  -- Database entities
    | CommentsLoaded (Result String (List DB.ItemCommentDb))  -- Database entities 
    | TagsLoaded (Result String (List Tag))  -- TODO: Use TagDb type


type alias RequestBundle =
    { id : String
    , context : Context
    , request : GetFeedReq
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , request = Nothing
      , context = Nothing
      , globalConfig = flags.globalConfig
      , globalState = flags.globalState
      , dbItems = []  -- Database entities
      , dbComments = []  -- Database entities
      , tags = []  -- TODO: Use TagDb type
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
            -- Start the async pipeline: load database entities first
            ( { model 
              | stage = LoadingItems
              , request = Just bundle.request
              , context = Just bundle.context
              }
            , DB.findMicroblogItems (DB.queryAll |> DB.sortByCreatedAt |> DB.paginate 0 50) ItemsLoaded
            )

        ItemsLoaded result ->
            case result of
                Ok dbItems ->
                    if List.isEmpty dbItems then
                        -- No items, complete immediately with empty API response
                        let
                            apiResponse = { items = [] }
                        in
                        ( { model | stage = Complete apiResponse }
                        , complete (encodeFeedResponse apiResponse)
                        )
                    else
                        -- Store database entities and load comments
                        ( { model 
                          | stage = LoadingComments dbItems
                          , dbItems = dbItems
                          }
                        , loadCommentsForItems dbItems
                        )
                        
                Err error ->
                    ( model
                    , complete (Encode.object [("error", Encode.string error)])
                    )

        CommentsLoaded result ->
            case model.stage of
                LoadingComments dbItems ->
                    case result of
                        Ok dbComments ->
                            -- Store database comment entities and load tags  
                            ( { model 
                              | stage = LoadingTags dbItems dbComments
                              , dbComments = dbComments
                              }
                            , loadTagsForItems dbItems
                            )
                            
                        Err error ->
                            ( model
                            , complete (Encode.object [("error", Encode.string error)])
                            )
                            
                _ ->
                    ( model, Cmd.none )

        TagsLoaded result ->
            case model.stage of
                LoadingTags dbItems dbComments ->
                    case result of
                        Ok tags ->
                            -- Transform database entities to API models
                            let
                                apiResponse = buildApiResponse dbItems dbComments tags
                            in
                            ( { model | stage = Complete apiResponse }
                            , complete (encodeFeedResponse apiResponse)
                            )
                            
                        Err error ->
                            ( model
                            , complete (Encode.object [("error", Encode.string error)])
                            )
                            
                _ ->
                    ( model, Cmd.none )


-- BUSINESS LOGIC

{-| Get server-issued timestamp for reliable time operations
This ensures all timestamps come from the server, preventing client manipulation

Example usage for database operations:
    let
        currentTime = getServerTimestamp model.globalConfig
        newItem = { title = "...", timestamp = currentTime, ... }
    in
    DB.createMicroblogItem newItem
-}
getServerTimestamp : GlobalConfig -> Int
getServerTimestamp config =
    config.serverNow


loadCommentsForItems : List DB.MicroblogItemDb -> Cmd Msg
loadCommentsForItems dbItems =
    -- TODO: Implement proper comment loading with host isolation
    -- For now, simulate immediate success with empty database comment entities
    let
        fakeTask = Task.succeed (Ok [])
    in
    Task.perform CommentsLoaded fakeTask


loadTagsForItems : List DB.MicroblogItemDb -> Cmd Msg  
loadTagsForItems dbItems =
    -- TODO: Implement proper tag loading with host isolation  
    -- For now, simulate immediate success with empty tags
    let
        fakeTask = Task.succeed (Ok [])
    in
    Task.perform TagsLoaded fakeTask


-- EXPLICIT TRANSFORMATION: Database Entities -> API Models

{-| Transform database entities into API response
This is where the explicit MicroblogItemDb -> MicroblogItemApi transformation happens
-}
buildApiResponse : List DB.MicroblogItemDb -> List DB.ItemCommentDb -> List Tag -> GetFeedRes
buildApiResponse dbItems dbComments tags =
    { items = List.map (transformDbItemToApi dbComments tags) dbItems }


{-| Transform a database MicroblogItem entity to API MicroblogItem model
This explicit transformation makes the data flow clear and type-safe
-}
transformDbItemToApi : List DB.ItemCommentDb -> List Tag -> DB.MicroblogItemDb -> MicroblogItem
transformDbItemToApi allDbComments allTags dbItem =
    let
        -- Filter comments and tags for this item
        itemDbComments = List.filter (.itemId >> (==) dbItem.id) allDbComments
        itemTags = List.filter (.itemId >> (==) dbItem.id) allTags
    in
    { id = dbItem.id
    , title = dbItem.title
    , link = dbItem.link |> Maybe.withDefault ""  -- API uses String, DB uses Maybe String
    , image = dbItem.image
    , extract = dbItem.extract |> Maybe.withDefault ""  -- API uses String, DB uses Maybe String
    , ownerComment = dbItem.ownerComment
    , timestamp = dbItem.timestamp
    , comments = List.map transformDbCommentToApi itemDbComments
    , tags = List.map .name itemTags
    }


{-| Transform a database ItemComment entity to API Comment model
-}
transformDbCommentToApi : DB.ItemCommentDb -> Comment
transformDbCommentToApi dbComment =
    { id = dbComment.id
    , parentId = dbComment.parentId
    , text = dbComment.text
    , authorName = dbComment.authorName
    , timestamp = dbComment.timestamp
    }


-- ENCODING

encodeFeedResponse : GetFeedRes -> Encode.Value
encodeFeedResponse response =
    Encode.object
        [ ("items", Encode.list encodeMicroblogItem response.items)
        ]


encodeMicroblogItem : MicroblogItem -> Encode.Value
encodeMicroblogItem item =
    Encode.object
        [ ("id", Encode.string item.id)
        , ("title", Encode.string item.title)
        , ("link", Encode.string item.link)
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", Encode.string item.extract)
        , ("owner_comment", Encode.string item.ownerComment)
        , ("timestamp", Encode.int item.timestamp)
        , ("comments", Encode.list encodeComment item.comments)
        , ("tags", Encode.list Encode.string item.tags)
        ]


encodeComment : Comment -> Encode.Value
encodeComment comment =
    Encode.object
        [ ("id", Encode.string comment.id)
        , ("parent_id", encodeMaybe Encode.string comment.parentId)
        , ("text", Encode.string comment.text)
        , ("author_name", Encode.string comment.authorName)
        , ("timestamp", Encode.int comment.timestamp)
        ]


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value


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
    handleRequest HandleRequest