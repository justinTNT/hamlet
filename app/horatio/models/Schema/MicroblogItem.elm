module Schema.MicroblogItem exposing (MicroblogItem)

{-| MicroblogItem model for curated content.

Each item represents a piece of content curated from the web,
with optional link, image, and extract.

-}

import Interface.Schema exposing (CreateTimestamp, DatabaseId, Link, MultiTenant, RichContent, SoftDelete, UpdateTimestamp)


type alias MicroblogItem =
    { id : DatabaseId String
    , host : MultiTenant
    , title : String
    , link : Maybe Link
    , image : Maybe Link
    , extract : Maybe RichContent
    , ownerComment : RichContent
    , createdAt : CreateTimestamp
    , updatedAt : UpdateTimestamp
    , viewCount : Int
    , deletedAt : SoftDelete
    }
