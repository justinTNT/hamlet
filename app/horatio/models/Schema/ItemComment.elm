module Schema.ItemComment exposing (ItemComment)

{-| ItemComment model for guest comments on microblog items.

Comments can be nested via parentId for threaded discussions.

-}

import Interface.Schema exposing (DatabaseId, ForeignKey, MultiTenant, SoftDelete, Timestamp)
import Schema.Guest exposing (Guest)
import Schema.MicroblogItem exposing (MicroblogItem)


type alias ItemComment =
    { id : DatabaseId String
    , host : MultiTenant
    , itemId : ForeignKey MicroblogItem String
    , guestId : ForeignKey Guest String
    , parentId : Maybe String
    , authorName : String
    , text : String
    , createdAt : Timestamp
    , deletedAt : SoftDelete
    }
