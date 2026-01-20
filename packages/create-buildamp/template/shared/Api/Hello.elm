module Api.Hello exposing (..)

{-| Hello API Endpoint

    A simple example endpoint that greets the user.
-}

import Framework.Api exposing (..)


type alias Request =
    { name : Required (Trim String)
    }


type alias Response =
    { message : String
    }
