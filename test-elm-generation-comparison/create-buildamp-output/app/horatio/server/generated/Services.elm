module Generated.Services exposing (..)

{-| Generated services interface for TEA handlers

This module provides strongly-typed external service integration
for making HTTP requests to third-party APIs.

@docs HttpRequest, HttpResponse, HttpMethod
@docs get, post, put, delete, request

-}

import Json.Encode as Encode
import Json.Decode as Decode
import Dict exposing (Dict)


-- HTTP REQUEST INTERFACE

{-| Make GET request
Usage: Services.get "https://api.example.com/users" [] handleResponse
-}
get : String -> List (String, String) -> (Result String HttpResponse -> msg) -> Cmd msg
get url headers callback =
    request
        { method = GET
        , url = url
        , headers = Dict.fromList headers
        , body = Nothing
        }
        callback


{-| Make POST request with JSON body
Usage: Services.post "https://api.example.com/users" [] (encodeUser user) handleResponse
-}
post : String -> List (String, String) -> Encode.Value -> (Result String HttpResponse -> msg) -> Cmd msg
post url headers body callback =
    request
        { method = POST
        , url = url
        , headers = Dict.fromList headers
        , body = Just body
        }
        callback


{-| Make PUT request with JSON body
-}
put : String -> List (String, String) -> Encode.Value -> (Result String HttpResponse -> msg) -> Cmd msg
put url headers body callback =
    request
        { method = PUT
        , url = url
        , headers = Dict.fromList headers
        , body = Just body
        }
        callback


{-| Make DELETE request
-}
delete : String -> List (String, String) -> (Result String HttpResponse -> msg) -> Cmd msg
delete url headers callback =
    request
        { method = DELETE
        , url = url
        , headers = Dict.fromList headers
        , body = Nothing
        }
        callback


{-| Make custom HTTP request
-}
request : HttpRequest -> (Result String HttpResponse -> msg) -> Cmd msg
request req callback =
    let
        requestId = "req_" ++ String.fromInt (abs (hashString (req.url ++ toString req.method)))
    in
    httpRequest
        { id = requestId
        , method = httpMethodToString req.method
        , url = req.url
        , headers = req.headers
        , body = req.body
        , callback = callback
        }


-- TYPES

type alias HttpRequest =
    { method : HttpMethod
    , url : String
    , headers : Dict String String
    , body : Maybe Encode.Value
    }


type alias HttpResponse =
    { status : Int
    , headers : Dict String String
    , body : String
    }


type HttpMethod
    = GET
    | POST
    | PUT
    | DELETE
    | PATCH


-- PORT INTERFACE (Internal - used by runtime)

port httpRequest : HttpRequestPort -> Cmd msg
port httpResponse : (HttpResponsePort -> msg) -> Sub msg


type alias HttpRequestPort =
    { id : String
    , method : String
    , url : String
    , headers : Dict String String
    , body : Maybe Encode.Value
    , callback : Result String HttpResponse -> msg
    }


type alias HttpResponsePort =
    { id : String
    , success : Bool
    , status : Maybe Int
    , headers : Maybe (Dict String String)
    , body : Maybe String
    , error : Maybe String
    }


-- INTERNAL HELPERS

httpMethodToString : HttpMethod -> String
httpMethodToString method =
    case method of
        GET -> "GET"
        POST -> "POST"  
        PUT -> "PUT"
        DELETE -> "DELETE"
        PATCH -> "PATCH"


toString : HttpMethod -> String
toString = httpMethodToString


hashString : String -> Int
hashString str =
    String.foldl (\char acc -> acc * 31 + Char.toCode char) 0 str
