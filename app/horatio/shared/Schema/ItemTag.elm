module Schema.ItemTag exposing (ItemTag)

{-| ItemTag join table for many-to-many relationship.

Links MicroblogItems to Tags. This is a join table with no
primary key - the combination of itemId and tagId is unique.

-}

import Framework.Schema exposing (ForeignKey, MultiTenant, SoftDelete)
import Schema.MicroblogItem exposing (MicroblogItem)
import Schema.Tag exposing (Tag)


type alias ItemTag =
    { itemId : ForeignKey MicroblogItem String
    , tagId : ForeignKey Tag String
    , host : MultiTenant
    , deletedAt : SoftDelete
    }
