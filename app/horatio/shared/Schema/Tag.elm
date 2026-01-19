module Schema.Tag exposing (Tag)

{-| Tag model for categorizing microblog items.

This is the Elm-native definition that replaces models/db/tag.rs.
Buildamp parses this to generate SQL, queries, and admin UI.

-}

import Framework.Schema exposing (DatabaseId, MultiTenant, SoftDelete)


type alias Tag =
    { id : DatabaseId String
    , host : MultiTenant
    , name : String
    , deletedAt : SoftDelete
    }
