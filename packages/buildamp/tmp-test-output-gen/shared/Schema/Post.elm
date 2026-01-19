
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId String
    , tenant : MultiTenant
    , title : String
    }
