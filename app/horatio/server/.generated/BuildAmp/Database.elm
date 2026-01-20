port module BuildAmp.Database exposing (..)

{-| Generated database interface for TEA handlers

This module provides a strongly-typed, capability-based database interface
that automatically handles host isolation and query building.

@docs Database, Query, Filter, Sort, Pagination
@docs findItems, findItem, createItem, updateItem, killItem
@docs queryAll, byId, byField, where_, orderBy, sortBy, sortByCreatedAt, paginate
@docs GlobalConfig, GlobalState

-}

import Interface.Query as Q
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
    , sort : List Sort
    , paginate : Maybe Pagination
    }


{-| Filter types for queries

Supports both legacy filters (ById, ByField) and the new type-safe
filter expressions from Interface.Query.

-}
type Filter a
    = ById String
    | ByField String String
    | Expr (Q.FilterExpr a)


{-| Sort direction
-}
type Direction
    = Asc
    | Desc


{-| Sort by field name and direction
-}
type alias Sort =
    { field : String
    , direction : Direction
    }


{-| Pagination parameters
-}
type alias Pagination =
    { offset : Int
    , limit : Int
    }


{-| Multi-tenant field type (same as String, for documentation)
-}
type alias MultiTenant = String


{-| Soft-delete field type (nullable timestamp)
-}
type alias SoftDelete = Maybe Int


{-| Auto-populated creation timestamp. Set on INSERT.
-}
type alias CreateTimestamp = Int


{-| Auto-populated update timestamp. Set on INSERT and UPDATE.
-}
type alias UpdateTimestamp = Int


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


{-| Add field filter to query
-}
byField : String -> String -> Query a -> Query a
byField field value query =
    { query | filter = query.filter ++ [ByField field value] }


{-| Sort by a field with direction
-}
sortBy : String -> Direction -> Query a -> Query a
sortBy field direction query =
    { query | sort = query.sort ++ [{ field = field, direction = direction }] }


{-| Sort by created_at descending (convenience helper)
-}
sortByCreatedAt : Query a -> Query a
sortByCreatedAt query =
    sortBy "created_at" Desc query


{-| Add pagination to query
-}
paginate : Int -> Int -> Query a -> Query a
paginate offset limit query =
    { query | paginate = Just { offset = offset, limit = limit } }


-- TYPE-SAFE QUERY BUILDERS (using Interface.Query)

{-| Add a type-safe filter expression to query

Use with operators from Interface.Query:

    import Interface.Query as Q
    import BuildAmp.Database.MicroblogItem as Blog

    DB.findMicroblogItems
        (DB.queryAll
            |> DB.where_ (Blog.viewCount |> Q.gt 100)
            |> DB.where_ (Blog.deletedAt |> Q.isNull)
        )

-}
where_ : Q.FilterExpr a -> Query a -> Query a
where_ expr query =
    { query | filter = query.filter ++ [Expr expr] }


{-| Add a type-safe sort expression to query

Use with sort operators from Interface.Query:

    import Interface.Query as Q
    import BuildAmp.Database.MicroblogItem as Blog

    DB.findMicroblogItems
        (DB.queryAll
            |> DB.orderBy (Q.desc Blog.createdAt)
        )

-}
orderBy : Q.SortExpr a -> Query a -> Query a
orderBy sortExpr query =
    let
        newSort =
            case sortExpr of
                Q.SortAsc field ->
                    { field = field, direction = Asc }

                Q.SortDesc field ->
                    { field = field, direction = Desc }
    in
    { query | sort = query.sort ++ [newSort] }


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


-- ENCODING/DECODING

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
        ByField field value ->
            Encode.object [("type", Encode.string "ByField"), ("field", Encode.string field), ("value", Encode.string value)]
        Expr expr ->
            Q.encodeFilterExpr expr


encodeDirection : Direction -> Encode.Value
encodeDirection direction =
    case direction of
        Asc -> Encode.string "asc"
        Desc -> Encode.string "desc"


encodeSort : Sort -> Encode.Value
encodeSort sort =
    Encode.object
        [ ("field", Encode.string sort.field)
        , ("direction", encodeDirection sort.direction)
        ]


encodeMaybePagination : Maybe Pagination -> Encode.Value
encodeMaybePagination maybePagination =
    case maybePagination of
        Nothing -> Encode.null
        Just pagination ->
            Encode.object
                [ ("offset", Encode.int pagination.offset)
                , ("limit", Encode.int pagination.limit)
                ]


-- DATABASE MODELS AND FUNCTIONS

-- GUEST TYPES (Generated from Guest.elm)

{-| Database entity for Guest
-}
type alias GuestDb =
    {     id : String -- DatabaseId String
    , host : MultiTenant -- MultiTenant
    , name : String -- String
    , picture : String -- String
    , sessionId : String -- String
    , createdAt : CreateTimestamp -- CreateTimestamp
    , deletedAt : SoftDelete -- SoftDelete
    }

{-| Database entity for creating new Guest
Framework fields (host, deletedAt) are injected automatically by the runtime.
-}
type alias GuestDbCreate =
    {     name : String
    , picture : String
    , sessionId : String
    }

{-| Database entity for updating existing Guest
All fields optional to support partial updates
-}
type alias GuestDbUpdate =
    {     host : Maybe MultiTenant
    , name : Maybe String
    , picture : Maybe String
    , sessionId : Maybe String
    , createdAt : Maybe CreateTimestamp
    , deletedAt : SoftDelete
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
        |> decodeField "host" Decode.string
        |> decodeField "name" Decode.string
        |> decodeField "picture" Decode.string
        |> decodeField "session_id" Decode.string
        |> decodeField "created_at" timestampDecoder
        |> decodeField "deleted_at" (Decode.nullable timestampDecoder)


encodeGuestDbCreate : GuestDbCreate -> Encode.Value
encodeGuestDbCreate item =
    Encode.object
        [ ("name", Encode.string item.name)
        , ("picture", Encode.string item.picture)
        , ("session_id", Encode.string item.sessionId)
        ]


encodeGuestDbUpdate : GuestDbUpdate -> Encode.Value
encodeGuestDbUpdate item =
    Encode.object
        [ ("host", encodeMaybe Encode.string item.host)
        , ("name", encodeMaybe Encode.string item.name)
        , ("picture", encodeMaybe Encode.string item.picture)
        , ("session_id", encodeMaybe Encode.string item.sessionId)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        , ("deleted_at", encodeMaybe Encode.int item.deletedAt)
        ]

-- ITEMCOMMENT TYPES (Generated from ItemComment.elm)

{-| Database entity for ItemComment
-}
type alias ItemCommentDb =
    {     id : String -- DatabaseId String
    , host : MultiTenant -- MultiTenant
    , itemId : String -- ForeignKey MicroblogItem String
    , guestId : String -- ForeignKey Guest String
    , parentId : Maybe String -- Maybe String
    , authorName : String -- String
    , text : String -- RichContent
    , createdAt : CreateTimestamp -- CreateTimestamp
    , deletedAt : SoftDelete -- SoftDelete
    }

{-| Database entity for creating new ItemComment
Framework fields (host, deletedAt) are injected automatically by the runtime.
-}
type alias ItemCommentDbCreate =
    {     itemId : String
    , guestId : String
    , parentId : Maybe String
    , authorName : String
    , text : String
    }

{-| Database entity for updating existing ItemComment
All fields optional to support partial updates
-}
type alias ItemCommentDbUpdate =
    {     host : Maybe MultiTenant
    , itemId : Maybe String
    , guestId : Maybe String
    , parentId : Maybe String
    , authorName : Maybe String
    , text : Maybe String
    , createdAt : Maybe CreateTimestamp
    , deletedAt : SoftDelete
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
        |> decodeField "host" Decode.string
        |> decodeField "item_id" Decode.string
        |> decodeField "guest_id" Decode.string
        |> decodeField "parent_id" (Decode.nullable Decode.string)
        |> decodeField "author_name" Decode.string
        |> decodeField "text" richContentDecoder
        |> decodeField "created_at" timestampDecoder
        |> decodeField "deleted_at" (Decode.nullable timestampDecoder)


encodeItemCommentDbCreate : ItemCommentDbCreate -> Encode.Value
encodeItemCommentDbCreate item =
    Encode.object
        [ ("item_id", Encode.string item.itemId)
        , ("guest_id", Encode.string item.guestId)
        , ("parent_id", encodeMaybe Encode.string item.parentId)
        , ("author_name", Encode.string item.authorName)
        , ("text", Encode.string item.text)
        ]


encodeItemCommentDbUpdate : ItemCommentDbUpdate -> Encode.Value
encodeItemCommentDbUpdate item =
    Encode.object
        [ ("host", encodeMaybe Encode.string item.host)
        , ("item_id", encodeMaybe Encode.string item.itemId)
        , ("guest_id", encodeMaybe Encode.string item.guestId)
        , ("parent_id", encodeMaybe Encode.string item.parentId)
        , ("author_name", encodeMaybe Encode.string item.authorName)
        , ("text", encodeMaybe Encode.string item.text)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        , ("deleted_at", encodeMaybe Encode.int item.deletedAt)
        ]

-- ITEMTAG TYPES (Generated from ItemTag.elm)

{-| Database entity for ItemTag
-}
type alias ItemTagDb =
    {     itemId : String -- ForeignKey MicroblogItem String
    , tagId : String -- ForeignKey Tag String
    , host : MultiTenant -- MultiTenant
    , deletedAt : SoftDelete -- SoftDelete
    }

{-| Database entity for creating new ItemTag
Framework fields (host, deletedAt) are injected automatically by the runtime.
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
    , host : Maybe MultiTenant
    , deletedAt : SoftDelete
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
        |> decodeField "host" Decode.string
        |> decodeField "deleted_at" (Decode.nullable timestampDecoder)


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
        , ("host", encodeMaybe Encode.string item.host)
        , ("deleted_at", encodeMaybe Encode.int item.deletedAt)
        ]

-- MICROBLOGITEM TYPES (Generated from MicroblogItem.elm)

{-| Database entity for MicroblogItem
-}
type alias MicroblogItemDb =
    {     id : String -- DatabaseId String
    , host : MultiTenant -- MultiTenant
    , title : String -- String
    , link : Maybe String -- Maybe Link
    , image : Maybe String -- Maybe Link
    , extract : Maybe String -- Maybe RichContent
    , ownerComment : String -- RichContent
    , createdAt : CreateTimestamp -- CreateTimestamp
    , updatedAt : UpdateTimestamp -- UpdateTimestamp
    , viewCount : Int -- Int
    , deletedAt : SoftDelete -- SoftDelete
    }

{-| Database entity for creating new MicroblogItem
Framework fields (host, deletedAt) are injected automatically by the runtime.
-}
type alias MicroblogItemDbCreate =
    {     title : String
    , link : Maybe String
    , image : Maybe String
    , extract : Maybe String
    , ownerComment : String
    , viewCount : Int
    }

{-| Database entity for updating existing MicroblogItem
All fields optional to support partial updates
-}
type alias MicroblogItemDbUpdate =
    {     host : Maybe MultiTenant
    , title : Maybe String
    , link : Maybe String
    , image : Maybe String
    , extract : Maybe String
    , ownerComment : Maybe String
    , createdAt : Maybe CreateTimestamp
    , updatedAt : Maybe UpdateTimestamp
    , viewCount : Maybe Int
    , deletedAt : SoftDelete
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
        |> decodeField "host" Decode.string
        |> decodeField "title" Decode.string
        |> decodeField "link" (Decode.nullable Decode.string)
        |> decodeField "image" (Decode.nullable Decode.string)
        |> decodeField "extract" (Decode.nullable richContentDecoder)
        |> decodeField "owner_comment" richContentDecoder
        |> decodeField "created_at" timestampDecoder
        |> decodeField "updated_at" timestampDecoder
        |> decodeField "view_count" Decode.int
        |> decodeField "deleted_at" (Decode.nullable timestampDecoder)


encodeMicroblogItemDbCreate : MicroblogItemDbCreate -> Encode.Value
encodeMicroblogItemDbCreate item =
    Encode.object
        [ ("title", Encode.string item.title)
        , ("link", encodeMaybe Encode.string item.link)
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", encodeMaybe Encode.string item.extract)
        , ("owner_comment", Encode.string item.ownerComment)
        , ("view_count", Encode.int item.viewCount)
        ]


encodeMicroblogItemDbUpdate : MicroblogItemDbUpdate -> Encode.Value
encodeMicroblogItemDbUpdate item =
    Encode.object
        [ ("host", encodeMaybe Encode.string item.host)
        , ("title", encodeMaybe Encode.string item.title)
        , ("link", encodeMaybe Encode.string item.link)
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", encodeMaybe Encode.string item.extract)
        , ("owner_comment", encodeMaybe Encode.string item.ownerComment)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        , ("updated_at", encodeMaybe Encode.int item.updatedAt)
        , ("view_count", encodeMaybe Encode.int item.viewCount)
        , ("deleted_at", encodeMaybe Encode.int item.deletedAt)
        ]

-- TAG TYPES (Generated from Tag.elm)

{-| Database entity for Tag
-}
type alias TagDb =
    {     id : String -- DatabaseId String
    , host : MultiTenant -- MultiTenant
    , name : String -- String
    , createdAt : CreateTimestamp -- CreateTimestamp
    , deletedAt : SoftDelete -- SoftDelete
    }

{-| Database entity for creating new Tag
Framework fields (host, deletedAt) are injected automatically by the runtime.
-}
type alias TagDbCreate =
    {     name : String
    }

{-| Database entity for updating existing Tag
All fields optional to support partial updates
-}
type alias TagDbUpdate =
    {     host : Maybe MultiTenant
    , name : Maybe String
    , createdAt : Maybe CreateTimestamp
    , deletedAt : SoftDelete
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
        |> decodeField "created_at" timestampDecoder
        |> decodeField "deleted_at" (Decode.nullable timestampDecoder)


encodeTagDbCreate : TagDbCreate -> Encode.Value
encodeTagDbCreate item =
    Encode.object
        [ ("name", Encode.string item.name)
        ]


encodeTagDbUpdate : TagDbUpdate -> Encode.Value
encodeTagDbUpdate item =
    Encode.object
        [ ("host", encodeMaybe Encode.string item.host)
        , ("name", encodeMaybe Encode.string item.name)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        , ("deleted_at", encodeMaybe Encode.int item.deletedAt)
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


-- RichContent decoder (handles JSONB object -> JSON string)
richContentDecoder : Decode.Decoder String
richContentDecoder =
    Decode.oneOf
        [ Decode.string  -- Already a string (legacy)
        , Decode.value |> Decode.map (Encode.encode 0)  -- JSONB object -> JSON string
        ]


-- UTILITY FUNCTIONS

hashString : String -> Int
hashString str =
    String.foldl (\char acc -> acc * 31 + Char.toCode char) 0 str


toString : Query a -> String
toString query =
    "filters:" ++ String.fromInt (List.length query.filter) ++ 
    "_sorts:" ++ String.fromInt (List.length query.sort) ++
    "_paginated:" ++ (if query.paginate /= Nothing then "yes" else "no")
