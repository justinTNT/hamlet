module Schema.MicroblogItem exposing (MicroblogItem)

{-| MicroblogItem model for curated content.

Each item represents a piece of content curated from the web,
with optional link, image, and extract.

-}

import Framework.Schema exposing (DatabaseId, Link, MultiTenant, RichContent, SoftDelete, Timestamp)


type alias MicroblogItem =
    { id : DatabaseId String
    , host : MultiTenant
    , title : String
    , link : Maybe Link
    , image : Maybe Link
    , extract : Maybe RichContent
    , ownerComment : RichContent
    , createdAt : Timestamp
    , viewCount : Int
    , deletedAt : SoftDelete
    }
