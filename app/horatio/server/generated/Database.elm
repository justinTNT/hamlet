module Generated.Database exposing (..)

{-| Generated database interface for TEA handlers

This module provides a strongly-typed, capability-based database interface
that automatically handles host isolation and query building.

@docs Database, Query, Filter, Sort, Pagination
@docs findItems, findItem, createItem, updateItem, killItem
@docs queryAll, byId, bySlug, sortByCreatedAt, paginate
@docs GlobalConfig, GlobalState

-}

import Json.Encode as Encode
import Json.Decode as Decode


-- GLOBAL TYPES FOR TEA HANDLERS

{-| Global configuration provided by server at handler initialization
Read-only data that's consistent across the request lifecycle
-}
type alias GlobalConfig =
    { serverNow : Int  -- Server-issued Unix timestamp (milliseconds)
    , hostIsolation : Bool  -- Whether host isolation is enabled
    , environment : String  -- "development", "production", etc.
    }


{-| Global state for the handler instance  
Mutable state that can be updated through TEA Model updates
-}
type alias GlobalState = 
    { requestCount : Int  -- Number of requests processed by this handler
    , lastActivity : Int  -- Last activity timestamp
    }


{-| Database service type - opaque to handlers
-}
type Database
    = Database


{-| Query builder for composable database operations
-}
type alias Query a =
    { filter : List (Filter a)
    , sort : List (Sort a)  
    , paginate : Maybe Pagination
    }


{-| Filter types for different models
-}
type Filter a
    = ById String
    | BySlug String
    | ByUserId String
    | ByField String String


{-| Sort options
-}
type Sort a
    = CreatedAtAsc
    | CreatedAtDesc
    | TitleAsc
    | TitleDesc


{-| Pagination parameters
-}
type alias Pagination =
    { offset : Int
    , limit : Int
    }


-- MICROBLOG ITEM DATABASE INTERFACE (Generated from db/microblog_items.rs)

{-| Find multiple microblog items with query builder
Returns database entities - use transformations to convert to API models

Usage in handler update function:
    ( model, DB.findMicroblogItems query )

Then listen for results in subscriptions:
    DB.dbResult |> Sub.map HandleDbResult
-}
findMicroblogItems : Query MicroblogItemDb -> Cmd msg
findMicroblogItems query =
    let
        requestId = "find_items_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "microblog_items"
        , query = encodeQuery query
        }


{-| Find a single microblog item by ID
Returns database entity - use transformation to convert to API model
-}
findMicroblogItem : String -> (Result String (Maybe MicroblogItemDb) -> msg) -> Cmd msg
findMicroblogItem id toMsg =
    let
        requestId = "find_item_" ++ id
        singleQuery = queryAll |> addFilter (ById id) |> limitOne
    in
    dbFind
        { id = requestId
        , table = "microblog_items" 
        , query = encodeQuery singleQuery
        }


{-| Create a new microblog item
Returns newly created database entity
-}
createMicroblogItem : MicroblogItemDbCreate -> (Result String MicroblogItemDb -> msg) -> Cmd msg
createMicroblogItem data toMsg =
    let
        requestId = "create_item_" ++ String.fromInt (abs (hashString data.title))
    in
    dbCreate
        { id = requestId
        , table = "microblog_items"
        , data = encodeMicroblogItemDbCreate data
        }


{-| Update an existing microblog item
Returns updated database entity
-}
updateMicroblogItem : String -> MicroblogItemDbUpdate -> (Result String MicroblogItemDb -> msg) -> Cmd msg
updateMicroblogItem id data toMsg =
    let
        requestId = "update_item_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "microblog_items"
        , data = encodeMicroblogItemDbUpdate data
        , where = "id = $1"
        , params = [id]
        }


{-| Delete a microblog item
Returns number of rows affected
-}
killMicroblogItem : String -> (Result String Int -> msg) -> Cmd msg
killMicroblogItem id toMsg =
    let
        requestId = "kill_item_" ++ id
    in
    dbKill
        { id = requestId
        , table = "microblog_items"
        , where = "id = $1"
        , params = [id]
        }


-- QUERY BUILDERS

{-| Empty query - returns all records
-}
queryAll : Query a
queryAll =
    { filter = []
    , sort = []
    , paginate = Nothing
    }


{-| Add ID filter to query
-}
byId : String -> Query a -> Query a
byId id query =
    { query | filter = query.filter ++ [ById id] }


{-| Add slug filter to query
-}
bySlug : String -> Query a -> Query a
bySlug slug query =
    { query | filter = query.filter ++ [BySlug slug] }


{-| Sort by created_at descending
-}
sortByCreatedAt : Query a -> Query a
sortByCreatedAt query =
    { query | sort = [CreatedAtDesc] }


{-| Add pagination to query
-}
paginate : Int -> Int -> Query a -> Query a
paginate offset limit query =
    { query | paginate = Just { offset = offset, limit = limit } }


-- INTERNAL HELPERS

addFilter : Filter a -> Query a -> Query a  
addFilter filter query =
    { query | filter = query.filter ++ [filter] }


limitOne : Query a -> Query a
limitOne query =
    { query | paginate = Just { offset = 0, limit = 1 } }


-- PORT INTERFACE (Internal - used by runtime)

port dbFind : DbFindRequest -> Cmd msg
port dbCreate : DbCreateRequest -> Cmd msg  
port dbUpdate : DbUpdateRequest -> Cmd msg
port dbKill : DbKillRequest -> Cmd msg
port dbResult : (DbResponse -> msg) -> Sub msg


type alias DbFindRequest =
    { id : String
    , table : String
    , query : Encode.Value
    }


type alias DbCreateRequest =
    { id : String
    , table : String
    , data : Encode.Value
    }


type alias DbUpdateRequest =
    { id : String
    , table : String
    , data : Encode.Value
    , where : String
    , params : List String
    }


type alias DbKillRequest =
    { id : String
    , table : String
    , where : String
    , params : List String
    }


type alias DbResponse =
    { id : String
    , success : Bool
    , data : Maybe Encode.Value
    , error : Maybe String
    }


-- ENCODING/DECODING (Generated from Rust models)

encodeQuery : Query a -> Encode.Value
encodeQuery query =
    Encode.object
        [ ("filter", Encode.list encodeFilter query.filter)
        , ("sort", Encode.list encodeSort query.sort)
        , ("paginate", encodeMaybePagination query.paginate)
        ]


encodeFilter : Filter a -> Encode.Value
encodeFilter filter =
    case filter of
        ById id ->
            Encode.object [("type", Encode.string "ById"), ("value", Encode.string id)]
        BySlug slug ->
            Encode.object [("type", Encode.string "BySlug"), ("value", Encode.string slug)]
        ByUserId userId ->
            Encode.object [("type", Encode.string "ByUserId"), ("value", Encode.string userId)]
        ByField field value ->
            Encode.object [("type", Encode.string "ByField"), ("field", Encode.string field), ("value", Encode.string value)]


encodeSort : Sort a -> Encode.Value
encodeSort sort =
    case sort of
        CreatedAtAsc -> Encode.string "created_at_asc"
        CreatedAtDesc -> Encode.string "created_at_desc"
        TitleAsc -> Encode.string "title_asc"
        TitleDesc -> Encode.string "title_desc"


encodeMaybePagination : Maybe Pagination -> Encode.Value
encodeMaybePagination maybePagination =
    case maybePagination of
        Nothing -> Encode.null
        Just pagination ->
            Encode.object
                [ ("offset", Encode.int pagination.offset)
                , ("limit", Encode.int pagination.limit)
                ]


-- ITEMCOMMENT TYPES (Generated from comments_db.rs)

{-| Database entity for ItemComment
This corresponds to the Rust ItemComment struct with database-specific types
-}
type alias ItemCommentDb =
    {     id : String -- DatabaseId<String> in Rust
    , itemId : String -- String in Rust
    , guestId : String -- String in Rust
    , parentId : Maybe String -- Option<String> in Rust
    , authorName : String -- String in Rust
    , text : String -- String in Rust
    , timestamp : Int -- Timestamp in Rust
    }

{-| Database entity for creating new ItemComment
Only includes fields that can be set during creation
-}
type alias ItemCommentDbCreate =
    {     itemId : String
    , guestId : String
    , authorName : String
    , text : String
    }

{-| Database entity for updating existing ItemComment
All fields optional to support partial updates
-}
type alias ItemCommentDbUpdate = 
    {     itemId : Maybe String
    , guestId : Maybe String
    , parentId : Maybe String
    , authorName : Maybe String
    , text : Maybe String
    }

-- SUBMITCOMMENTDATA TYPES (Generated from comments_db.rs)

{-| Database entity for SubmitCommentData
This corresponds to the Rust SubmitCommentData struct with database-specific types
-}
type alias SubmitCommentDataDb =
    {     existingGuest : Maybe GuestDb -- Option<Guest> in Rust
    , freshGuestId : String -- String in Rust
    , freshCommentId : String -- String in Rust
    }

{-| Database entity for creating new SubmitCommentData
Only includes fields that can be set during creation
-}
type alias SubmitCommentDataDbCreate =
    {     freshGuestId : String
    , freshCommentId : String
    }

{-| Database entity for updating existing SubmitCommentData
All fields optional to support partial updates
-}
type alias SubmitCommentDataDbUpdate = 
    {     existingGuest : Maybe GuestDb
    , freshGuestId : Maybe String
    , freshCommentId : Maybe String
    }

-- MICROBLOGITEM TYPES (Generated from feed_db.rs)

{-| Database entity for MicroblogItem
This corresponds to the Rust MicroblogItem struct with database-specific types
-}
type alias MicroblogItemDb =
    {     id : String -- DatabaseId<String> in Rust
    , title : String -- String in Rust
    , link : Maybe String -- Option<String> in Rust
    , image : Maybe String -- Option<String> in Rust
    , extract : Maybe String -- Option<String> in Rust
    , ownerComment : String -- DefaultComment in Rust
    , tags : List String -- Vec<String> in Rust
    , comments : List ItemCommentDb -- Vec<ItemComment> in Rust
    , timestamp : Int -- Timestamp in Rust
    , viewCount : Int -- i32 in Rust
    }

{-| Database entity for creating new MicroblogItem
Only includes fields that can be set during creation
-}
type alias MicroblogItemDbCreate =
    {     title : String
    , ownerComment : String
    , tags : List String
    , comments : List ItemCommentDb
    , viewCount : Int
    }

{-| Database entity for updating existing MicroblogItem
All fields optional to support partial updates
-}
type alias MicroblogItemDbUpdate = 
    {     title : Maybe String
    , link : Maybe String
    , image : Maybe String
    , extract : Maybe String
    , ownerComment : Maybe String
    , tags : Maybe List String
    , comments : Maybe List ItemCommentDb
    , viewCount : Maybe Int
    }

-- SUBMITITEMDATA TYPES (Generated from feed_db.rs)

{-| Database entity for SubmitItemData
This corresponds to the Rust SubmitItemData struct with database-specific types
-}
type alias SubmitItemDataDb =
    {     existingTags : List TagDb -- Vec<Tag> in Rust
    , freshTagIds : List String -- Vec<String> in Rust
    }

{-| Database entity for creating new SubmitItemData
Only includes fields that can be set during creation
-}
type alias SubmitItemDataDbCreate =
    {     existingTags : List TagDb
    , freshTagIds : List String
    }

{-| Database entity for updating existing SubmitItemData
All fields optional to support partial updates
-}
type alias SubmitItemDataDbUpdate = 
    {     existingTags : Maybe List TagDb
    , freshTagIds : Maybe List String
    }

-- GUEST TYPES (Generated from identity_db.rs)

{-| Database entity for Guest
This corresponds to the Rust Guest struct with database-specific types
-}
type alias GuestDb =
    {     id : String -- DatabaseId<String> in Rust
    , sessionId : String -- String in Rust
    , createdAt : Int -- Timestamp in Rust
    }

{-| Database entity for creating new Guest
Only includes fields that can be set during creation
-}
type alias GuestDbCreate =
    {     sessionId : String
    , createdAt : Int
    }

{-| Database entity for updating existing Guest
All fields optional to support partial updates
-}
type alias GuestDbUpdate = 
    {     sessionId : Maybe String
    , createdAt : Maybe Int
    }

-- TAG TYPES (Generated from tags_db.rs)

{-| Database entity for Tag
This corresponds to the Rust Tag struct with database-specific types
-}
type alias TagDb =
    {     id : String -- DatabaseId<String> in Rust
    , name : String -- String in Rust
    }

{-| Database entity for creating new Tag
Only includes fields that can be set during creation
-}
type alias TagDbCreate =
    {     name : String
    }

{-| Database entity for updating existing Tag
All fields optional to support partial updates
-}
type alias TagDbUpdate = 
    {     name : Maybe String
    }


-- DECODERS (Generated from Rust database models)

decodeMicroblogItemDb : DbResponse -> Result String MicroblogItemDb
decodeMicroblogItemDb response =
    if response.success then
        case response.data of
            Just data ->
                case Decode.decodeValue microblogItemDbDecoder data of
                    Ok item -> Ok item
                    Err error -> Err (Decode.errorToString error)
            Nothing -> Err "No data in response"
    else
        Err (response.error |> Maybe.withDefault "Unknown database error")


decodeMicroblogItemDbList : DbResponse -> Result String (List MicroblogItemDb)
decodeMicroblogItemDbList response =
    if response.success then
        case response.data of
            Just data ->
                case Decode.decodeValue (Decode.list microblogItemDbDecoder) data of
                    Ok items -> Ok items
                    Err error -> Err (Decode.errorToString error)
            Nothing -> Err "No data in response"
    else
        Err (response.error |> Maybe.withDefault "Unknown database error")


microblogItemDbDecoder : Decode.Decoder MicroblogItemDb
microblogItemDbDecoder =
    Decode.succeed MicroblogItemDb
        |> decodeField "id" Decode.string
        |> decodeField "title" Decode.string
        |> decodeField "link" (Decode.nullable Decode.string)
        |> decodeField "image" (Decode.nullable Decode.string)
        |> decodeField "extract" (Decode.nullable Decode.string)
        |> decodeField "owner_comment" Decode.string
        |> decodeField "tags" (Decode.list Decode.string)
        |> decodeField "comments" (Decode.list itemCommentDbDecoder)
        |> decodeField "timestamp" Decode.int
        |> decodeField "view_count" (Decode.oneOf [Decode.int, Decode.succeed 0])  -- Default for new field


itemCommentDbDecoder : Decode.Decoder ItemCommentDb
itemCommentDbDecoder =
    Decode.succeed ItemCommentDb
        |> decodeField "id" Decode.string
        |> decodeField "item_id" Decode.string
        |> decodeField "parent_id" (Decode.nullable Decode.string)
        |> decodeField "text" Decode.string
        |> decodeField "author_name" Decode.string
        |> decodeField "timestamp" Decode.int


-- Helper for pipeline-style decoding
decodeField : String -> Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
decodeField fieldName decoder =
    Decode.andMap (Decode.field fieldName decoder)


encodeMicroblogItemDbCreate : MicroblogItemDbCreate -> Encode.Value
encodeMicroblogItemDbCreate item =
    Encode.object
        [ ("title", Encode.string item.title)
        , ("link", encodeMaybe Encode.string item.link)
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", encodeMaybe Encode.string item.extract)
        , ("owner_comment", Encode.string item.ownerComment)
        , ("tags", Encode.list Encode.string item.tags)
        ]


encodeMicroblogItemDbUpdate : MicroblogItemDbUpdate -> Encode.Value
encodeMicroblogItemDbUpdate item =
    Encode.object
        [ ("title", encodeMaybe Encode.string item.title)
        , ("link", encodeMaybe Encode.string item.link)  
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", encodeMaybe Encode.string item.extract)
        , ("owner_comment", encodeMaybe Encode.string item.ownerComment)
        , ("tags", encodeMaybe (Encode.list Encode.string) item.tags)
        , ("view_count", encodeMaybe Encode.int item.viewCount)
        ]


decodeRowCount : DbResponse -> Result String Int
decodeRowCount response =
    if response.success then
        case response.data of
            Just data ->
                case Decode.decodeValue Decode.int data of
                    Ok count -> Ok count
                    Err error -> Err (Decode.errorToString error)
            Nothing -> Err "No data in response"
    else
        Err (response.error |> Maybe.withDefault "Unknown database error")


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value


-- UTILITY FUNCTIONS

hashString : String -> Int
hashString str =
    String.foldl (\char acc -> acc * 31 + Char.toCode char) 0 str


toString : Query a -> String
toString query =
    "filters:" ++ String.fromInt (List.length query.filter) ++ 
    "_sorts:" ++ String.fromInt (List.length query.sort) ++
    "_paginated:" ++ (if query.paginate /= Nothing then "yes" else "no")
