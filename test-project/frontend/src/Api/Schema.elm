module Api.Schema exposing (..)

import Json.Decode
import Json.Encode

-- DEFINITIONS

type alias IncrementRes =
    { newValue : Int
    }


type alias StandardServerContext =
    { dummy : String
    }


type alias IncrementReq =
    { amount : Int
    }


type alias IncrementReqBundle =
    { context : StandardServerContext
    , input : IncrementReq
    , data : StandardServerContext
    }


type alias Counter =
    { value : Int
    }


-- ENCODERS

incrementReqBundleEncoder : IncrementReqBundle -> Json.Encode.Value
incrementReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (incrementReqEncoder) struct.input )
        , ( "data", (standardServerContextEncoder) struct.data )
        ]


incrementReqEncoder : IncrementReq -> Json.Encode.Value
incrementReqEncoder struct =
    Json.Encode.object
        [ ( "amount", (Json.Encode.int) struct.amount )
        ]


incrementResEncoder : IncrementRes -> Json.Encode.Value
incrementResEncoder struct =
    Json.Encode.object
        [ ( "new_value", (Json.Encode.int) struct.newValue )
        ]


standardServerContextEncoder : StandardServerContext -> Json.Encode.Value
standardServerContextEncoder struct =
    Json.Encode.object
        [ ( "dummy", (Json.Encode.string) struct.dummy )
        ]


counterEncoder : Counter -> Json.Encode.Value
counterEncoder struct =
    Json.Encode.object
        [ ( "value", (Json.Encode.int) struct.value )
        ]


-- DECODERS

standardServerContextDecoder : Json.Decode.Decoder StandardServerContext
standardServerContextDecoder =
    Json.Decode.succeed StandardServerContext
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "dummy" (Json.Decode.string)))


incrementReqDecoder : Json.Decode.Decoder IncrementReq
incrementReqDecoder =
    Json.Decode.succeed IncrementReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "amount" (Json.Decode.int)))


incrementReqBundleDecoder : Json.Decode.Decoder IncrementReqBundle
incrementReqBundleDecoder =
    Json.Decode.succeed IncrementReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (incrementReqDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "data" (standardServerContextDecoder)))


incrementResDecoder : Json.Decode.Decoder IncrementRes
incrementResDecoder =
    Json.Decode.succeed IncrementRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "new_value" (Json.Decode.int)))


counterDecoder : Json.Decode.Decoder Counter
counterDecoder =
    Json.Decode.succeed Counter
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "value" (Json.Decode.int)))
