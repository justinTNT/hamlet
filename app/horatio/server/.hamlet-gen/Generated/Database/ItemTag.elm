module Generated.Database.ItemTag exposing (..)

{-| Type-safe field accessors for ItemTag

Use these with Interface.Query operators for compile-time safe queries:

    import Interface.Query as Q
    import Generated.Database.ItemTag as ItemTag

    -- Filter by field
    ItemTag.title |> Q.eq "Hello"

    -- Sort by field
    Q.desc ItemTag.createdAt

-}

import Interface.Query exposing (Field(..))
import Generated.Database exposing (ItemTagDb)
import Json.Encode as Encode


{-| Field accessor for item_id
-}
itemId : Field ItemTagDb String
itemId =
    Field "item_id" Encode.string


{-| Field accessor for tag_id
-}
tagId : Field ItemTagDb String
tagId =
    Field "tag_id" Encode.string


{-| Field accessor for host
-}
host : Field ItemTagDb String
host =
    Field "host" Encode.string


{-| Field accessor for deleted_at
-}
deletedAt : Field ItemTagDb (Maybe Int)
deletedAt =
    Field "deleted_at" (Maybe.withDefault Encode.null << Maybe.map Encode.int)
