module BuildAmp.Database.Tag exposing (..)

{-| Type-safe field accessors for Tag

Use these with Interface.Query operators for compile-time safe queries:

    import Interface.Query as Q
    import BuildAmp.Database.Tag as Tag

    -- Filter by field
    Tag.title |> Q.eq "Hello"

    -- Sort by field
    Q.desc Tag.createdAt

-}

import Interface.Query exposing (Field(..))
import BuildAmp.Database exposing (TagDb)
import Json.Encode as Encode


{-| Field accessor for id
-}
id : Field TagDb String
id =
    Field "id" Encode.string


{-| Field accessor for host
-}
host : Field TagDb String
host =
    Field "host" Encode.string


{-| Field accessor for name
-}
name : Field TagDb String
name =
    Field "name" Encode.string


{-| Field accessor for created_at
-}
createdAt : Field TagDb Int
createdAt =
    Field "created_at" Encode.int


{-| Field accessor for deleted_at
-}
deletedAt : Field TagDb (Maybe Int)
deletedAt =
    Field "deleted_at" (Maybe.withDefault Encode.null << Maybe.map Encode.int)
