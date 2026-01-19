module Schema.Guest exposing (Guest)

{-| Guest model for anonymous commenters.

Guests are identified by a session ID and can leave comments
on microblog items.

-}

import Framework.Schema exposing (DatabaseId, MultiTenant, SoftDelete, Timestamp)


type alias Guest =
    { id : DatabaseId String
    , host : MultiTenant
    , name : String
    , picture : String
    , sessionId : String
    , createdAt : Timestamp
    , deletedAt : SoftDelete
    }
