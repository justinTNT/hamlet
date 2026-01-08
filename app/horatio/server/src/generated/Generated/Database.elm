port module Generated.Database exposing (..)

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
    , whereClause : String
    , params : List String
    }


type alias DbKillRequest =
    { id : String
    , table : String
    , whereClause : String
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


-- DATABASE MODELS AND FUNCTIONS (Generated from Rust database models)

-- GUEST TYPES (Generated from guest.rs)

{-| Database entity for Guest
This corresponds to the Rust Guest struct with database-specific types
-}
type alias GuestDb =
    {     id : String -- DatabaseId<String> in Rust
    , name : String -- String in Rust
    , picture : String -- String in Rust
    , sessionId : String -- String in Rust
    , createdAt : Int -- Timestamp in Rust
    }

{-| Database entity for creating new Guest
Only includes fields that can be set during creation
-}
type alias GuestDbCreate =
    {     name : String
    , picture : String
    , sessionId : String
    , createdAt : Int
    }

{-| Database entity for updating existing Guest
All fields optional to support partial updates
-}
type alias GuestDbUpdate = 
    {     name : Maybe String
    , picture : Maybe String
    , sessionId : Maybe String
    , createdAt : Maybe Int
    }

-- GUEST CRUD OPERATIONS

{-| Find multiple guests with query builder
-}
findGuests : Query GuestDb -> Cmd msg
findGuests query =
    let
        requestId = "find_guest_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "guest"
        , query = encodeQuery query
        }


{-| Create a new guest
-}
createGuest : GuestDbCreate -> (Result String GuestDb -> msg) -> Cmd msg
createGuest data toMsg =
    let
        requestId = "create_guest_" ++ String.fromInt (abs (hashString (encodeGuestDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "guest"
        , data = encodeGuestDbCreate data
        }


{-| Update an existing guest
-}
updateGuest : String -> GuestDbUpdate -> (Result String GuestDb -> msg) -> Cmd msg
updateGuest id data toMsg =
    let
        requestId = "update_guest_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "guest"
        , data = encodeGuestDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a guest
-}
killGuest : String -> (Result String Int -> msg) -> Cmd msg
killGuest id toMsg =
    let
        requestId = "kill_guest_" ++ id
    in
    dbKill
        { id = requestId
        , table = "guest"
        , whereClause = "id = $1"
        , params = [id]
        }

-- GUEST ENCODERS/DECODERS

guestDbDecoder : Decode.Decoder GuestDb
guestDbDecoder =
    Decode.succeed GuestDb
        |> decodeField "id" Decode.string
        |> decodeField "name" Decode.string
        |> decodeField "picture" Decode.string
        |> decodeField "session_id" Decode.string
        |> decodeField "created_at" timestampDecoder


encodeGuestDbCreate : GuestDbCreate -> Encode.Value
encodeGuestDbCreate item =
    Encode.object
        [ ("name", Encode.string item.name)
        , ("picture", Encode.string item.picture)
        , ("session_id", Encode.string item.sessionId)
        , ("created_at", Encode.int item.createdAt)
        ]


encodeGuestDbUpdate : GuestDbUpdate -> Encode.Value
encodeGuestDbUpdate item =
    Encode.object
        [ ("name", encodeMaybe Encode.string item.name)
        , ("picture", encodeMaybe Encode.string item.picture)
        , ("session_id", encodeMaybe Encode.string item.sessionId)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        ]

-- ITEMCOMMENT TYPES (Generated from item_comment.rs)

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
    , createdAt : Int -- Timestamp in Rust
    }

{-| Database entity for creating new ItemComment
Only includes fields that can be set during creation
-}
type alias ItemCommentDbCreate =
    {     itemId : String
    , guestId : String
    , authorName : String
    , text : String
    , createdAt : Int
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
    , createdAt : Maybe Int
    }

-- ITEMCOMMENT CRUD OPERATIONS

{-| Find multiple itemComments with query builder
-}
findItemComments : Query ItemCommentDb -> Cmd msg
findItemComments query =
    let
        requestId = "find_item_comment_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "item_comment"
        , query = encodeQuery query
        }


{-| Create a new itemComment
-}
createItemComment : ItemCommentDbCreate -> (Result String ItemCommentDb -> msg) -> Cmd msg
createItemComment data toMsg =
    let
        requestId = "create_item_comment_" ++ String.fromInt (abs (hashString (encodeItemCommentDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "item_comment"
        , data = encodeItemCommentDbCreate data
        }


{-| Update an existing itemComment
-}
updateItemComment : String -> ItemCommentDbUpdate -> (Result String ItemCommentDb -> msg) -> Cmd msg
updateItemComment id data toMsg =
    let
        requestId = "update_item_comment_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "item_comment"
        , data = encodeItemCommentDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a itemComment
-}
killItemComment : String -> (Result String Int -> msg) -> Cmd msg
killItemComment id toMsg =
    let
        requestId = "kill_item_comment_" ++ id
    in
    dbKill
        { id = requestId
        , table = "item_comment"
        , whereClause = "id = $1"
        , params = [id]
        }

-- ITEMCOMMENT ENCODERS/DECODERS

itemcommentDbDecoder : Decode.Decoder ItemCommentDb
itemcommentDbDecoder =
    Decode.succeed ItemCommentDb
        |> decodeField "id" Decode.string
        |> decodeField "item_id" Decode.string
        |> decodeField "guest_id" Decode.string
        |> decodeField "parent_id" (Decode.nullable Decode.string)
        |> decodeField "author_name" Decode.string
        |> decodeField "text" Decode.string
        |> decodeField "created_at" timestampDecoder


encodeItemCommentDbCreate : ItemCommentDbCreate -> Encode.Value
encodeItemCommentDbCreate item =
    Encode.object
        [ ("item_id", Encode.string item.itemId)
        , ("guest_id", Encode.string item.guestId)
        , ("author_name", Encode.string item.authorName)
        , ("text", Encode.string item.text)
        , ("created_at", Encode.int item.createdAt)
        ]


encodeItemCommentDbUpdate : ItemCommentDbUpdate -> Encode.Value
encodeItemCommentDbUpdate item =
    Encode.object
        [ ("item_id", encodeMaybe Encode.string item.itemId)
        , ("guest_id", encodeMaybe Encode.string item.guestId)
        , ("parent_id", encodeMaybe Encode.string item.parentId)
        , ("author_name", encodeMaybe Encode.string item.authorName)
        , ("text", encodeMaybe Encode.string item.text)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        ]

-- ITEMTAG TYPES (Generated from item_tag.rs)

{-| Database entity for ItemTag
This corresponds to the Rust ItemTag struct with database-specific types
-}
type alias ItemTagDb =
    {     itemId : String -- String in Rust
    , tagId : String -- String in Rust
    }

{-| Database entity for creating new ItemTag
Only includes fields that can be set during creation
-}
type alias ItemTagDbCreate =
    {     itemId : String
    , tagId : String
    }

{-| Database entity for updating existing ItemTag
All fields optional to support partial updates
-}
type alias ItemTagDbUpdate = 
    {     itemId : Maybe String
    , tagId : Maybe String
    }

-- ITEMTAG CRUD OPERATIONS

{-| Find multiple itemTags with query builder
-}
findItemTags : Query ItemTagDb -> Cmd msg
findItemTags query =
    let
        requestId = "find_item_tag_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "item_tag"
        , query = encodeQuery query
        }


{-| Create a new itemTag
-}
createItemTag : ItemTagDbCreate -> (Result String ItemTagDb -> msg) -> Cmd msg
createItemTag data toMsg =
    let
        requestId = "create_item_tag_" ++ String.fromInt (abs (hashString (encodeItemTagDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "item_tag"
        , data = encodeItemTagDbCreate data
        }


{-| Update an existing itemTag
-}
updateItemTag : String -> ItemTagDbUpdate -> (Result String ItemTagDb -> msg) -> Cmd msg
updateItemTag id data toMsg =
    let
        requestId = "update_item_tag_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "item_tag"
        , data = encodeItemTagDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a itemTag
-}
killItemTag : String -> (Result String Int -> msg) -> Cmd msg
killItemTag id toMsg =
    let
        requestId = "kill_item_tag_" ++ id
    in
    dbKill
        { id = requestId
        , table = "item_tag"
        , whereClause = "id = $1"
        , params = [id]
        }

-- ITEMTAG ENCODERS/DECODERS

itemtagDbDecoder : Decode.Decoder ItemTagDb
itemtagDbDecoder =
    Decode.succeed ItemTagDb
        |> decodeField "item_id" Decode.string
        |> decodeField "tag_id" Decode.string


encodeItemTagDbCreate : ItemTagDbCreate -> Encode.Value
encodeItemTagDbCreate item =
    Encode.object
        [ ("item_id", Encode.string item.itemId)
        , ("tag_id", Encode.string item.tagId)
        ]


encodeItemTagDbUpdate : ItemTagDbUpdate -> Encode.Value
encodeItemTagDbUpdate item =
    Encode.object
        [ ("item_id", encodeMaybe Encode.string item.itemId)
        , ("tag_id", encodeMaybe Encode.string item.tagId)
        ]

-- MICROBLOGITEM TYPES (Generated from microblog_item.rs)

{-| Database entity for MicroblogItem
This corresponds to the Rust MicroblogItem struct with database-specific types
-}
type alias MicroblogItemDb =
    {     id : String -- DatabaseId<String> in Rust
    , data : MicroblogItemDataDb -- JsonBlob<MicroblogItemData> in Rust
    , createdAt : Int -- Timestamp in Rust
    , viewCount : Int -- i32 in Rust
    }

{-| Database entity for creating new MicroblogItem
Only includes fields that can be set during creation
-}
type alias MicroblogItemDbCreate =
    {     data : MicroblogItemDataDb
    , createdAt : Int
    , viewCount : Int
    }

{-| Database entity for updating existing MicroblogItem
All fields optional to support partial updates
-}
type alias MicroblogItemDbUpdate = 
    {     data : Maybe MicroblogItemDataDb
    , createdAt : Maybe Int
    , viewCount : Maybe Int
    }

-- MICROBLOGITEM CRUD OPERATIONS

{-| Find multiple microblogItems with query builder
-}
findMicroblogItems : Query MicroblogItemDb -> Cmd msg
findMicroblogItems query =
    let
        requestId = "find_microblog_item_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "microblog_item"
        , query = encodeQuery query
        }


{-| Create a new microblogItem
-}
createMicroblogItem : MicroblogItemDbCreate -> (Result String MicroblogItemDb -> msg) -> Cmd msg
createMicroblogItem data toMsg =
    let
        requestId = "create_microblog_item_" ++ String.fromInt (abs (hashString (encodeMicroblogItemDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "microblog_item"
        , data = encodeMicroblogItemDbCreate data
        }


{-| Update an existing microblogItem
-}
updateMicroblogItem : String -> MicroblogItemDbUpdate -> (Result String MicroblogItemDb -> msg) -> Cmd msg
updateMicroblogItem id data toMsg =
    let
        requestId = "update_microblog_item_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "microblog_item"
        , data = encodeMicroblogItemDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a microblogItem
-}
killMicroblogItem : String -> (Result String Int -> msg) -> Cmd msg
killMicroblogItem id toMsg =
    let
        requestId = "kill_microblog_item_" ++ id
    in
    dbKill
        { id = requestId
        , table = "microblog_item"
        , whereClause = "id = $1"
        , params = [id]
        }

-- MICROBLOGITEM ENCODERS/DECODERS

microblogitemDbDecoder : Decode.Decoder MicroblogItemDb
microblogitemDbDecoder =
    Decode.succeed MicroblogItemDb
        |> decodeField "id" Decode.string
        |> decodeField "data" microblogitemdataDbDecoder
        |> decodeField "created_at" timestampDecoder
        |> decodeField "view_count" Decode.int


encodeMicroblogItemDbCreate : MicroblogItemDbCreate -> Encode.Value
encodeMicroblogItemDbCreate item =
    Encode.object
        [ ("data", encodeMicroblogItemDataDb item.data)
        , ("created_at", Encode.int item.createdAt)
        , ("view_count", Encode.int item.viewCount)
        ]


encodeMicroblogItemDbUpdate : MicroblogItemDbUpdate -> Encode.Value
encodeMicroblogItemDbUpdate item =
    Encode.object
        [ ("data", encodeMaybe encodeMicroblogItemDataDb item.data)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        , ("view_count", encodeMaybe Encode.int item.viewCount)
        ]

-- MICROBLOGITEMDATA COMPONENT TYPE (Generated from microblog_item.rs)

{-| Database entity for MicroblogItemData
This corresponds to the Rust MicroblogItemData struct with database-specific types
-}
type alias MicroblogItemDataDb =
    {     title : String -- String in Rust
    , link : Maybe String -- Option<String> in Rust
    , image : Maybe String -- Option<String> in Rust
    , extract : Maybe String -- Option<RichContent> in Rust
    , ownerComment : String -- RichContent in Rust
    }

-- MICROBLOGITEMDATA ENCODERS/DECODERS

microblogitemdataDbDecoder : Decode.Decoder MicroblogItemDataDb
microblogitemdataDbDecoder =
    Decode.succeed MicroblogItemDataDb
        |> decodeField "title" Decode.string
        |> decodeField "link" (Decode.nullable Decode.string)
        |> decodeField "image" (Decode.nullable Decode.string)
        |> decodeField "extract" (Decode.nullable Decode.string)
        |> decodeField "owner_comment" Decode.string


encodeMicroblogItemDataDb : MicroblogItemDataDb -> Encode.Value
encodeMicroblogItemDataDb item =
    Encode.object
        [ ("title", Encode.string item.title)
        , ("link", encodeMaybe Encode.string item.link)
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", encodeMaybe Encode.string item.extract)
        , ("owner_comment", Encode.string item.ownerComment)
        ]

-- TAG TYPES (Generated from tag.rs)

{-| Database entity for Tag
This corresponds to the Rust Tag struct with database-specific types
-}
type alias TagDb =
    {     id : String -- DatabaseId<String> in Rust
    , host : String -- String in Rust
    , name : String -- String in Rust
    }

{-| Database entity for creating new Tag
Only includes fields that can be set during creation
-}
type alias TagDbCreate =
    {     host : String
    , name : String
    }

{-| Database entity for updating existing Tag
All fields optional to support partial updates
-}
type alias TagDbUpdate = 
    {     host : Maybe String
    , name : Maybe String
    }

-- TAG CRUD OPERATIONS

{-| Find multiple tags with query builder
-}
findTags : Query TagDb -> Cmd msg
findTags query =
    let
        requestId = "find_tag_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "tag"
        , query = encodeQuery query
        }


{-| Create a new tag
-}
createTag : TagDbCreate -> (Result String TagDb -> msg) -> Cmd msg
createTag data toMsg =
    let
        requestId = "create_tag_" ++ String.fromInt (abs (hashString (encodeTagDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "tag"
        , data = encodeTagDbCreate data
        }


{-| Update an existing tag
-}
updateTag : String -> TagDbUpdate -> (Result String TagDb -> msg) -> Cmd msg
updateTag id data toMsg =
    let
        requestId = "update_tag_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "tag"
        , data = encodeTagDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a tag
-}
killTag : String -> (Result String Int -> msg) -> Cmd msg
killTag id toMsg =
    let
        requestId = "kill_tag_" ++ id
    in
    dbKill
        { id = requestId
        , table = "tag"
        , whereClause = "id = $1"
        , params = [id]
        }

-- TAG ENCODERS/DECODERS

tagDbDecoder : Decode.Decoder TagDb
tagDbDecoder =
    Decode.succeed TagDb
        |> decodeField "id" Decode.string
        |> decodeField "host" Decode.string
        |> decodeField "name" Decode.string


encodeTagDbCreate : TagDbCreate -> Encode.Value
encodeTagDbCreate item =
    Encode.object
        [ ("host", Encode.string item.host)
        , ("name", Encode.string item.name)
        ]


encodeTagDbUpdate : TagDbUpdate -> Encode.Value
encodeTagDbUpdate item =
    Encode.object
        [ ("host", encodeMaybe Encode.string item.host)
        , ("name", encodeMaybe Encode.string item.name)
        ]


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value


-- DECODER HELPER FUNCTIONS

-- Helper for pipeline-style decoding  
andMap : Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
andMap = Decode.map2 (|>)

decodeField : String -> Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
decodeField fieldName decoder =
    andMap (Decode.field fieldName decoder)


-- PostgreSQL BIGINT timestamp decoder (handles both string and int)
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


-- UTILITY FUNCTIONS

hashString : String -> Int
hashString str =
    String.foldl (\char acc -> acc * 31 + Char.toCode char) 0 str


toString : Query a -> String
toString query =
    "filters:" ++ String.fromInt (List.length query.filter) ++ 
    "_sorts:" ++ String.fromInt (List.length query.sort) ++
    "_paginated:" ++ (if query.paginate /= Nothing then "yes" else "no")
