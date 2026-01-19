module Generated.Database.MicroblogItem exposing (..)

{-| Type-safe field accessors for MicroblogItem

Use these with Interface.Query operators for compile-time safe queries:

    import Interface.Query as Q
    import Generated.Database.MicroblogItem as MicroblogItem

    -- Filter by field
    MicroblogItem.title |> Q.eq "Hello"

    -- Sort by field
    Q.desc MicroblogItem.createdAt

-}

import Interface.Query exposing (Field(..))
import Generated.Database exposing (MicroblogItemDb)
import Json.Encode as Encode


{-| Field accessor for id
-}
id : Field MicroblogItemDb String
id =
    Field "id" Encode.string


{-| Field accessor for host
-}
host : Field MicroblogItemDb String
host =
    Field "host" Encode.string


{-| Field accessor for title
-}
title : Field MicroblogItemDb String
title =
    Field "title" Encode.string


{-| Field accessor for link
-}
link : Field MicroblogItemDb (Maybe String)
link =
    Field "link" (Maybe.withDefault Encode.null << Maybe.map Encode.string)


{-| Field accessor for image
-}
image : Field MicroblogItemDb (Maybe String)
image =
    Field "image" (Maybe.withDefault Encode.null << Maybe.map Encode.string)


{-| Field accessor for extract
-}
extract : Field MicroblogItemDb (Maybe String)
extract =
    Field "extract" (Maybe.withDefault Encode.null << Maybe.map Encode.string)


{-| Field accessor for owner_comment
-}
ownerComment : Field MicroblogItemDb String
ownerComment =
    Field "owner_comment" Encode.string


{-| Field accessor for created_at
-}
createdAt : Field MicroblogItemDb Int
createdAt =
    Field "created_at" Encode.int


{-| Field accessor for view_count
-}
viewCount : Field MicroblogItemDb Int
viewCount =
    Field "view_count" Encode.int


{-| Field accessor for deleted_at
-}
deletedAt : Field MicroblogItemDb (Maybe Int)
deletedAt =
    Field "deleted_at" (Maybe.withDefault Encode.null << Maybe.map Encode.int)
