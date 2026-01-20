module BuildAmp.Database.Guest exposing (..)

{-| Type-safe field accessors for Guest

Use these with Interface.Query operators for compile-time safe queries:

    import Interface.Query as Q
    import BuildAmp.Database.Guest as Guest

    -- Filter by field
    Guest.title |> Q.eq "Hello"

    -- Sort by field
    Q.desc Guest.createdAt

-}

import Interface.Query exposing (Field(..))
import BuildAmp.Database exposing (GuestDb)
import Json.Encode as Encode


{-| Field accessor for id
-}
id : Field GuestDb String
id =
    Field "id" Encode.string


{-| Field accessor for host
-}
host : Field GuestDb String
host =
    Field "host" Encode.string


{-| Field accessor for name
-}
name : Field GuestDb String
name =
    Field "name" Encode.string


{-| Field accessor for picture
-}
picture : Field GuestDb String
picture =
    Field "picture" Encode.string


{-| Field accessor for session_id
-}
sessionId : Field GuestDb String
sessionId =
    Field "session_id" Encode.string


{-| Field accessor for created_at
-}
createdAt : Field GuestDb Int
createdAt =
    Field "created_at" Encode.int


{-| Field accessor for deleted_at
-}
deletedAt : Field GuestDb (Maybe Int)
deletedAt =
    Field "deleted_at" (Maybe.withDefault Encode.null << Maybe.map Encode.int)
