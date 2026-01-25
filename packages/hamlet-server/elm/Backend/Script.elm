module Backend.Script exposing
    ( Script
    , succeed
    , fail
    , map
    , andThen
    , andThenDecode
    , sequence
    , forEach
    -- Database operations
    , dbCreate
    , dbFind
    , dbFindOne
    -- Query builders
    , Query
    , queryAll
    , queryById
    , byField
    , sortBy
    , sortByDesc
    , encodeQuery
    -- SSE operations
    , broadcast
    -- Accessors for runtime
    , run
    , Step(..)
    , Operation(..)
    )

{-| Linear script abstraction for backend handlers.

Instead of writing full TEA with Model, Msg, Stage, update, subscriptions,
you write a linear script:

    handler : Request -> Script Response
    handler req =
        dbCreate "item" (itemData req)
            |> andThen (\item ->
                succeed { id = item.id }
            )

The Backend.Runtime module handles all the TEA wiring.

-}

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


{-| A Script describes a computation that may perform async operations.

Internally it's a continuation-based Free Monad:
- Succeed a: we're done with value a
- Fail String: we're done with an error
- Step: perform an operation, then continue with the result

-}
type Script a
    = Succeed a
    | Fail String
    | Step Operation (Result String Encode.Value -> Script a)


{-| An operation the runtime knows how to execute -}
type Operation
    = DbCreate { table : String, data : Encode.Value }
    | DbFind { table : String, query : Encode.Value }
    | Broadcast { eventType : String, data : Encode.Value }


{-| What the runtime sees when it runs one step -}
type Step a
    = Done (Result String a)
    | Continue Operation (Result String Encode.Value -> Script a)


{-| Run one step of a script. Returns either a final result or the next operation to perform. -}
run : Script a -> Step a
run script =
    case script of
        Succeed a ->
            Done (Ok a)

        Fail err ->
            Done (Err err)

        Step op cont ->
            Continue op cont



-- CORE COMBINATORS


{-| A script that immediately succeeds with a value -}
succeed : a -> Script a
succeed a =
    Succeed a


{-| A script that immediately fails with an error -}
fail : String -> Script a
fail err =
    Fail err


{-| Transform the result of a script -}
map : (a -> b) -> Script a -> Script b
map f script =
    case script of
        Succeed a ->
            Succeed (f a)

        Fail err ->
            Fail err

        Step op cont ->
            Step op (\result -> map f (cont result))


{-| Chain scripts together -}
andThen : (a -> Script b) -> Script a -> Script b
andThen f script =
    case script of
        Succeed a ->
            f a

        Fail err ->
            Fail err

        Step op cont ->
            Step op (\result -> andThen f (cont result))


{-| Chain with a decoder for the intermediate result -}
andThenDecode : Decoder a -> (a -> Script b) -> Script Encode.Value -> Script b
andThenDecode decoder f script =
    script
        |> andThen
            (\value ->
                case Decode.decodeValue decoder value of
                    Ok a ->
                        f a

                    Err err ->
                        Fail (Decode.errorToString err)
            )


{-| Run a list of scripts in sequence, collecting results -}
sequence : List (Script a) -> Script (List a)
sequence scripts =
    case scripts of
        [] ->
            Succeed []

        first :: rest ->
            first
                |> andThen
                    (\a ->
                        sequence rest
                            |> map (\as_ -> a :: as_)
                    )


{-| Run a script for each item in a list, sequentially -}
forEach : List a -> (a -> Script b) -> Script (List b)
forEach items f =
    sequence (List.map f items)



-- DATABASE OPERATIONS


{-| Create a record in a table. Returns the raw JSON response. -}
dbCreate : String -> Encode.Value -> Script Encode.Value
dbCreate table data =
    Step
        (DbCreate { table = table, data = data })
        (\result ->
            case result of
                Ok value ->
                    Succeed value

                Err err ->
                    Fail err
        )


{-| Find records in a table. Returns raw JSON array.

    dbFind "items" queryAll
    dbFind "items" (queryAll |> sortByDesc "created_at")
    dbFind "items" (queryById "abc-123")

-}
dbFind : String -> Query -> Script Encode.Value
dbFind table query =
    Step
        (DbFind { table = table, query = encodeQuery query })
        (\result ->
            case result of
                Ok value ->
                    Succeed value

                Err err ->
                    Fail err
        )


{-| Find one record by ID. Returns raw JSON or fails if not found.

    dbFindOne "items" "abc-123"

-}
dbFindOne : String -> String -> Script Encode.Value
dbFindOne table id =
    dbFind table (queryById id)
        |> andThen
            (\value ->
                case Decode.decodeValue (Decode.index 0 Decode.value) value of
                    Ok item ->
                        Succeed item

                    Err _ ->
                        Fail ("No record found in " ++ table)
            )



-- SSE OPERATIONS


{-| Broadcast an event via Server-Sent Events. Fire-and-forget operation. -}
broadcast : String -> Encode.Value -> Script ()
broadcast eventType data =
    Step
        (Broadcast { eventType = eventType, data = data })
        (\_ -> Succeed ())



-- QUERY BUILDERS


{-| A query specification for dbFind operations.

Build queries using the query builder functions:

    -- Get all records
    dbFind "items" queryAll

    -- Get by ID
    dbFind "items" (queryById "abc-123")

    -- Get all, sorted
    dbFind "items" (queryAll |> sortByDesc "created_at")

    -- Filter by field
    dbFind "items" (queryAll |> byField "status" "active")

-}
type alias Query =
    { filter : List Filter
    , sort : List Sort
    }


type Filter
    = ById String
    | ByField String String


type alias Sort =
    { field : String
    , direction : SortDirection
    }


type SortDirection
    = Asc
    | Desc


{-| Empty query - returns all records (with host isolation applied by runtime) -}
queryAll : Query
queryAll =
    { filter = []
    , sort = []
    }


{-| Query for a single record by ID -}
queryById : String -> Query
queryById id =
    { filter = [ ById id ]
    , sort = []
    }


{-| Add a field filter to a query -}
byField : String -> String -> Query -> Query
byField field value query =
    { query | filter = query.filter ++ [ ByField field value ] }


{-| Add ascending sort to a query -}
sortBy : String -> Query -> Query
sortBy field query =
    { query | sort = query.sort ++ [ { field = field, direction = Asc } ] }


{-| Add descending sort to a query -}
sortByDesc : String -> Query -> Query
sortByDesc field query =
    { query | sort = query.sort ++ [ { field = field, direction = Desc } ] }


{-| Encode a Query to JSON for the runtime -}
encodeQuery : Query -> Encode.Value
encodeQuery query =
    Encode.object
        [ ( "filter", Encode.list encodeFilter query.filter )
        , ( "sort", Encode.list encodeSort query.sort )
        ]


encodeFilter : Filter -> Encode.Value
encodeFilter filter =
    case filter of
        ById id ->
            Encode.object
                [ ( "type", Encode.string "ById" )
                , ( "value", Encode.string id )
                ]

        ByField field value ->
            Encode.object
                [ ( "type", Encode.string "ByField" )
                , ( "field", Encode.string field )
                , ( "value", Encode.string value )
                ]


encodeSort : Sort -> Encode.Value
encodeSort sort =
    Encode.object
        [ ( "field", Encode.string sort.field )
        , ( "direction"
          , Encode.string
                (case sort.direction of
                    Asc ->
                        "Asc"

                    Desc ->
                        "Desc"
                )
          )
        ]
