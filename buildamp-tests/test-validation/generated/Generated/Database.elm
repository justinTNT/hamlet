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

-- BLOGPOST TYPES (Generated from blog_post.rs)

{-| Database entity for BlogPost
This corresponds to the Rust BlogPost struct with database-specific types
-}
type alias BlogPostDb =
    {     id : String -- DatabaseId<String> in Rust
    , data : BlogPostDataDb -- JsonBlob<BlogPostData> in Rust
    , createdAt : Int -- Timestamp in Rust
    , viewCount : Int -- i32 in Rust
    }

{-| Database entity for creating new BlogPost
Only includes fields that can be set during creation
-}
type alias BlogPostDbCreate =
    {     data : BlogPostDataDb
    , createdAt : Int
    , viewCount : Int
    }

{-| Database entity for updating existing BlogPost
All fields optional to support partial updates
-}
type alias BlogPostDbUpdate = 
    {     data : Maybe BlogPostDataDb
    , createdAt : Maybe Int
    , viewCount : Maybe Int
    }

-- BLOGPOST CRUD OPERATIONS

{-| Find multiple blogPosts with query builder
-}
findBlogPosts : Query BlogPostDb -> Cmd msg
findBlogPosts query =
    let
        requestId = "find_blog_posts_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "blog_posts"
        , query = encodeQuery query
        }


{-| Create a new blogPost
-}
createBlogPost : BlogPostDbCreate -> (Result String BlogPostDb -> msg) -> Cmd msg
createBlogPost data toMsg =
    let
        requestId = "create_blog_posts_" ++ String.fromInt (abs (hashString (encodeBlogPostDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "blog_posts"
        , data = encodeBlogPostDbCreate data
        }


{-| Update an existing blogPost
-}
updateBlogPost : String -> BlogPostDbUpdate -> (Result String BlogPostDb -> msg) -> Cmd msg
updateBlogPost id data toMsg =
    let
        requestId = "update_blog_posts_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "blog_posts"
        , data = encodeBlogPostDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a blogPost
-}
killBlogPost : String -> (Result String Int -> msg) -> Cmd msg
killBlogPost id toMsg =
    let
        requestId = "kill_blog_posts_" ++ id
    in
    dbKill
        { id = requestId
        , table = "blog_posts"
        , whereClause = "id = $1"
        , params = [id]
        }

-- BLOGPOST ENCODERS/DECODERS

blogpostDbDecoder : Decode.Decoder BlogPostDb
blogpostDbDecoder =
    Decode.succeed BlogPostDb
        |> decodeField "id" Decode.string
        |> decodeField "data" blogpostdataDbDecoder
        |> decodeField "created_at" timestampDecoder
        |> decodeField "view_count" Decode.int


encodeBlogPostDbCreate : BlogPostDbCreate -> Encode.Value
encodeBlogPostDbCreate item =
    Encode.object
        [ ("data", encodeBlogPostDataDb item.data)
        , ("created_at", Encode.int item.createdAt)
        , ("view_count", Encode.int item.viewCount)
        ]


encodeBlogPostDbUpdate : BlogPostDbUpdate -> Encode.Value
encodeBlogPostDbUpdate item =
    Encode.object
        [ ("data", encodeMaybe encodeBlogPostDataDb item.data)
        , ("created_at", encodeMaybe Encode.int item.createdAt)
        , ("view_count", encodeMaybe Encode.int item.viewCount)
        ]

-- BLOGPOSTDATA COMPONENT TYPE (Generated from blog_post.rs)

{-| Database entity for BlogPostData
This corresponds to the Rust BlogPostData struct with database-specific types
-}
type alias BlogPostDataDb =
    {     title : String -- String in Rust
    , content : String -- String in Rust
    , excerpt : Maybe String -- Option<String> in Rust
    , authorNote : String -- DefaultComment in Rust
    }

-- BLOGPOSTDATA ENCODERS/DECODERS

blogpostdataDbDecoder : Decode.Decoder BlogPostDataDb
blogpostdataDbDecoder =
    Decode.succeed BlogPostDataDb
        |> decodeField "title" Decode.string
        |> decodeField "content" Decode.string
        |> decodeField "excerpt" (Decode.nullable Decode.string)
        |> decodeField "author_note" Decode.string


encodeBlogPostDataDb : BlogPostDataDb -> Encode.Value
encodeBlogPostDataDb item =
    Encode.object
        [ ("title", Encode.string item.title)
        , ("content", Encode.string item.content)
        , ("excerpt", encodeMaybe Encode.string item.excerpt)
        , ("author_note", Encode.string item.authorNote)
        ]

-- CATEGORY TYPES (Generated from category.rs)

{-| Database entity for Category
This corresponds to the Rust Category struct with database-specific types
-}
type alias CategoryDb =
    {     id : String -- String in Rust
    , name : String -- String in Rust
    , description : Maybe String -- Option<String> in Rust
    }

{-| Database entity for creating new Category
Only includes fields that can be set during creation
-}
type alias CategoryDbCreate =
    {     name : String
    }

{-| Database entity for updating existing Category
All fields optional to support partial updates
-}
type alias CategoryDbUpdate = 
    {     name : Maybe String
    , description : Maybe String
    }

-- CATEGORY CRUD OPERATIONS

{-| Find multiple categorys with query builder
-}
findCategorys : Query CategoryDb -> Cmd msg
findCategorys query =
    let
        requestId = "find_categories_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "categories"
        , query = encodeQuery query
        }


{-| Create a new category
-}
createCategory : CategoryDbCreate -> (Result String CategoryDb -> msg) -> Cmd msg
createCategory data toMsg =
    let
        requestId = "create_categories_" ++ String.fromInt (abs (hashString (encodeCategoryDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "categories"
        , data = encodeCategoryDbCreate data
        }


{-| Update an existing category
-}
updateCategory : String -> CategoryDbUpdate -> (Result String CategoryDb -> msg) -> Cmd msg
updateCategory id data toMsg =
    let
        requestId = "update_categories_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "categories"
        , data = encodeCategoryDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a category
-}
killCategory : String -> (Result String Int -> msg) -> Cmd msg
killCategory id toMsg =
    let
        requestId = "kill_categories_" ++ id
    in
    dbKill
        { id = requestId
        , table = "categories"
        , whereClause = "id = $1"
        , params = [id]
        }

-- CATEGORY ENCODERS/DECODERS

categoryDbDecoder : Decode.Decoder CategoryDb
categoryDbDecoder =
    Decode.succeed CategoryDb
        |> decodeField "id" Decode.string
        |> decodeField "name" Decode.string
        |> decodeField "description" (Decode.nullable Decode.string)


encodeCategoryDbCreate : CategoryDbCreate -> Encode.Value
encodeCategoryDbCreate item =
    Encode.object
        [ ("name", Encode.string item.name)
        ]


encodeCategoryDbUpdate : CategoryDbUpdate -> Encode.Value
encodeCategoryDbUpdate item =
    Encode.object
        [ ("name", encodeMaybe Encode.string item.name)
        , ("description", encodeMaybe Encode.string item.description)
        ]

-- POSTCATEGORY TYPES (Generated from post_category.rs)

{-| Database entity for PostCategory
This corresponds to the Rust PostCategory struct with database-specific types
-}
type alias PostCategoryDb =
    {     postId : String -- String in Rust
    , categoryId : String -- String in Rust
    }

{-| Database entity for creating new PostCategory
Only includes fields that can be set during creation
-}
type alias PostCategoryDbCreate =
    {     postId : String
    , categoryId : String
    }

{-| Database entity for updating existing PostCategory
All fields optional to support partial updates
-}
type alias PostCategoryDbUpdate = 
    {     postId : Maybe String
    , categoryId : Maybe String
    }

-- POSTCATEGORY CRUD OPERATIONS

{-| Find multiple postCategorys with query builder
-}
findPostCategorys : Query PostCategoryDb -> Cmd msg
findPostCategorys query =
    let
        requestId = "find_post_categories_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "post_categories"
        , query = encodeQuery query
        }


{-| Create a new postCategory
-}
createPostCategory : PostCategoryDbCreate -> (Result String PostCategoryDb -> msg) -> Cmd msg
createPostCategory data toMsg =
    let
        requestId = "create_post_categories_" ++ String.fromInt (abs (hashString (encodePostCategoryDbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "post_categories"
        , data = encodePostCategoryDbCreate data
        }


{-| Update an existing postCategory
-}
updatePostCategory : String -> PostCategoryDbUpdate -> (Result String PostCategoryDb -> msg) -> Cmd msg
updatePostCategory id data toMsg =
    let
        requestId = "update_post_categories_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "post_categories"
        , data = encodePostCategoryDbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a postCategory
-}
killPostCategory : String -> (Result String Int -> msg) -> Cmd msg
killPostCategory id toMsg =
    let
        requestId = "kill_post_categories_" ++ id
    in
    dbKill
        { id = requestId
        , table = "post_categories"
        , whereClause = "id = $1"
        , params = [id]
        }

-- POSTCATEGORY ENCODERS/DECODERS

postcategoryDbDecoder : Decode.Decoder PostCategoryDb
postcategoryDbDecoder =
    Decode.succeed PostCategoryDb
        |> decodeField "post_id" Decode.string
        |> decodeField "category_id" Decode.string


encodePostCategoryDbCreate : PostCategoryDbCreate -> Encode.Value
encodePostCategoryDbCreate item =
    Encode.object
        [ ("post_id", Encode.string item.postId)
        , ("category_id", Encode.string item.categoryId)
        ]


encodePostCategoryDbUpdate : PostCategoryDbUpdate -> Encode.Value
encodePostCategoryDbUpdate item =
    Encode.object
        [ ("post_id", encodeMaybe Encode.string item.postId)
        , ("category_id", encodeMaybe Encode.string item.categoryId)
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
