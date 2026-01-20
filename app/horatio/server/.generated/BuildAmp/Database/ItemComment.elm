module BuildAmp.Database.ItemComment exposing (..)

{-| Type-safe field accessors for ItemComment

Use these with Interface.Query operators for compile-time safe queries:

    import Interface.Query as Q
    import BuildAmp.Database.ItemComment as ItemComment

    -- Filter by field
    ItemComment.title |> Q.eq "Hello"

    -- Sort by field
    Q.desc ItemComment.createdAt

-}

import Interface.Query exposing (Field(..))
import BuildAmp.Database exposing (ItemCommentDb)
import Json.Encode as Encode


{-| Field accessor for id
-}
id : Field ItemCommentDb String
id =
    Field "id" Encode.string


{-| Field accessor for host
-}
host : Field ItemCommentDb String
host =
    Field "host" Encode.string


{-| Field accessor for item_id
-}
itemId : Field ItemCommentDb String
itemId =
    Field "item_id" Encode.string


{-| Field accessor for guest_id
-}
guestId : Field ItemCommentDb String
guestId =
    Field "guest_id" Encode.string


{-| Field accessor for parent_id
-}
parentId : Field ItemCommentDb (Maybe String)
parentId =
    Field "parent_id" (Maybe.withDefault Encode.null << Maybe.map Encode.string)


{-| Field accessor for author_name
-}
authorName : Field ItemCommentDb String
authorName =
    Field "author_name" Encode.string


{-| Field accessor for text
-}
text : Field ItemCommentDb String
text =
    Field "text" Encode.string


{-| Field accessor for created_at
-}
createdAt : Field ItemCommentDb Int
createdAt =
    Field "created_at" Encode.int


{-| Field accessor for deleted_at
-}
deletedAt : Field ItemCommentDb (Maybe Int)
deletedAt =
    Field "deleted_at" (Maybe.withDefault Encode.null << Maybe.map Encode.int)
