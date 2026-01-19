
module Schema.Item exposing (..)

type alias Item =
    { id : DatabaseId String
    , host : MultiTenant
    , removedAt : SoftDelete
    , title : String
    }
