module Api.Http exposing (send)

import Api
import Http

send : (Result Http.Error response -> msg) -> Api.Request response -> Cmd msg
send toMsg request =
    Http.request
        { method = "POST"
        , headers = [ Http.header "X-RPC-Endpoint" request.endpoint ]
        , url = "/api"
        , body = Http.jsonBody request.body
        , expect = Http.expectJson toMsg request.decoder
        , timeout = Nothing
        , tracker = Nothing
        }
