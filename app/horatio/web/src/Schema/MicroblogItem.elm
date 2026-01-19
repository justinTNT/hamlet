module Schema.MicroblogItem exposing (..)

import Framework.Schema exposing (..)
import Framework.Database exposing (Field(..))
import Framework.RichContent exposing (RichContent)

{-| MicroblogItem
Explicitly requests:
1. Multitenancy (via `host`)
2. Soft Deletion (via `deletedAt`)
-}
type alias MicroblogItem =
    { id : DatabaseId String
    , host : BuildampHost String
    , title : String
    , link : Link String
    , image : Link String
    , extract : Link RichContent
    , ownerComment : DefaultValue RichContent
    , viewCount : DefaultValue Int
    , createdAt : Timestamp
    , deletedAt : SoftDelete Timestamp
    }

-- TABLE NAME (Used by Query Builder)

table : String
table = "microblog_item"

-- GENERATED FIELD ACCESSORS (The "Power" part)
-- These allow type-safe queries like:
-- query |> where_ (gt viewCount 100)

id : Field MicroblogItem String
id = Field "id"

host : Field MicroblogItem String
host = Field "host"

title : Field MicroblogItem String
title = Field "title"

viewCount : Field MicroblogItem Int
viewCount = Field "view_count"

createdAt : Field MicroblogItem Int
createdAt = Field "created_at"

deletedAt : Field MicroblogItem (Maybe Int)
deletedAt = Field "deleted_at"
