port module BuildAmp.Services exposing (..)

{-| Generated services interface for TEA handlers

This module provides strongly-typed external service integration
for making HTTP requests to third-party APIs.

@docs HttpRequest, HttpResponse, HttpMethod
@docs get, post, put, delete, request

-}

import Json.Encode as Encode
import Json.Decode as Decode


-- HTTP REQUEST INTERFACE

{-| Make GET request
Usage: Services.get "https://api.example.com/users" [] handleResponse
-}
get : String -> List (String, String) -> Cmd msg
get url headers =
    request
        { method = GET
        , url = url
        , headers = headers
        , body = Nothing
        }


{-| Make POST request with JSON body
Usage: Services.post "https://api.example.com/users" [] (encodeUser user) handleResponse
-}
post : String -> List (String, String) -> Encode.Value -> Cmd msg
post url headers body =
    request
        { method = POST
        , url = url
        , headers = headers
        , body = Just body
        }


{-| Make PUT request with JSON body
-}
put : String -> List (String, String) -> Encode.Value -> Cmd msg
put url headers body =
    request
        { method = PUT
        , url = url
        , headers = headers
        , body = Just body
        }


{-| Make DELETE request
-}
delete : String -> List (String, String) -> Cmd msg
delete url headers =
    request
        { method = DELETE
        , url = url
        , headers = headers
        , body = Nothing
        }


{-| Make custom HTTP request
-}
request : HttpRequest -> Cmd msg
request req =
    let
        requestId = "req_" ++ String.fromInt (abs (hashString (req.url ++ toString req.method)))
    in
    httpRequest
        { id = requestId
        , method = httpMethodToString req.method
        , url = req.url
        , headers = req.headers
        , body = req.body
        }


-- TYPES

type alias HttpRequest =
    { method : HttpMethod
    , url : String
    , headers : List (String, String)
    , body : Maybe Encode.Value
    }


type alias HttpResponse =
    { status : Int
    , headers : List (String, String)
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
    , headers : List (String, String)
    , body : Maybe Encode.Value
    }


type alias HttpResponsePort =
    { id : String
    , success : Bool
    , status : Maybe Int
    , headers : Maybe (List (String, String))
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


-- SSE INTERFACE (Server-Sent Events)

{-| Broadcast an SSE event to all connected clients.
The event type should be snake_case (e.g., "new_comment_event").

Usage:
    Services.broadcast "new_comment_event" (encodeComment comment)
-}
broadcast : String -> Encode.Value -> Cmd msg
broadcast eventType data =
    sseBroadcast
        { eventType = eventType
        , data = data
        }


-- SSE PORT INTERFACE (Internal - used by runtime)

port sseBroadcast : SseBroadcastPort -> Cmd msg


type alias SseBroadcastPort =
    { eventType : String
    , data : Encode.Value
    }
