module Schema.ItemComment exposing (ItemComment)

{-| ItemComment model for guest comments on microblog items.

Comments can be nested via parentId for threaded discussions.

-}

import Interface.Schema exposing (CreateTimestamp, DatabaseId, ForeignKey, MultiTenant, RichContent, SoftDelete)
import Schema.Guest exposing (Guest)
import Schema.MicroblogItem exposing (MicroblogItem)


type alias ItemComment =
    { id : DatabaseId String
    , host : MultiTenant
    , itemId : ForeignKey MicroblogItem String
    , guestId : ForeignKey Guest String
    , parentId : Maybe String
    , authorName : String
    , text : RichContent
    , removed : Bool -- Set by admin moderation
    , createdAt : CreateTimestamp
    , deletedAt : SoftDelete
    }
