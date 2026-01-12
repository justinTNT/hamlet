module TestDecoder exposing (main)

import Browser
import Html exposing (..)
import Json.Decode as Decode
import Api.Schema


type Msg
    = NoOp


main : Program () () Msg
main =
    Browser.sandbox
        { init = ()
        , view = view
        , update = \_ model -> model
        }


view : () -> Html Msg
view _ =
    let
        testJson =
            """
            {
              "items": [{
                "id": "1764429007709",
                "title": "Planning to bite into a sweet, juicy mango?",
                "image": "https://example.com/image.jpg",
                "extract": "While most mangoes are grown...",
                "owner_comment": "mangone",
                "timestamp": 1764429007710
              }]
            }
            """
        
        result =
            Decode.decodeString Api.Schema.getFeedResDecoder testJson
    in
    div []
        [ h1 [] [ text "Decoder Test" ]
        , case result of
            Ok res ->
                div []
                    [ text "Success! Items: "
                    , text (String.fromInt (List.length res.items))
                    ]
            
            Err error ->
                div []
                    [ text "Error: "
                    , text (Decode.errorToString error)
                    ]
        ]