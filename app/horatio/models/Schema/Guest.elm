module Schema.Guest exposing (Guest)

{-| Guest model for anonymous commenters.

Guests are identified by a session ID and can leave comments
on microblog items.

-}

import Interface.Schema exposing (CreateTimestamp, DatabaseId, MultiTenant, SoftDelete)


type alias Guest =
    { id : DatabaseId String
    , host : MultiTenant
    , name : String
    , picture : String
    , sessionId : String
    , createdAt : CreateTimestamp
    , deletedAt : SoftDelete
    }
