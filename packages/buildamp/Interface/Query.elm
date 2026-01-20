module Interface.Query exposing
    ( Field(..)
    , FilterExpr(..)
    , SortExpr(..)
    , and
    , or
    , not_
    , eq
    , neq
    , gt
    , gte
    , lt
    , lte
    , like
    , ilike
    , isNull
    , isNotNull
    , in_
    , asc
    , desc
    , encodeFilterExpr
    , encodeSortExpr
    )

{-| Type-safe query building with phantom types.

This module provides a compile-time safe way to build database queries.
Field accessors are generated per-model and carry phantom types that
ensure field names and value types are correct.

## Example Usage

    import Framework.Query as Q
    import BuildAmp.Database as DB
    import BuildAmp.Database.MicroblogItem as Blog

    loadPopularItems : Cmd Msg
    loadPopularItems =
        DB.findMicroblogItems
            (DB.queryAll
                |> Q.where_
                    (Q.and
                        [ Blog.viewCount |> Q.gt 100
                        , Blog.title |> Q.like "%Elm%"
                        , Blog.deletedAt |> Q.isNull
                        ]
                    )
                |> Q.orderBy (Q.desc Blog.createdAt)
                |> DB.paginate 0 50
            )

@docs Field, FilterExpr, SortExpr
@docs and, or, not_
@docs eq, neq, gt, gte, lt, lte, like, ilike, isNull, isNotNull, in_
@docs asc, desc
@docs encodeFilterExpr, encodeSortExpr

-}

import Json.Encode as Encode


-- CORE TYPES


{-| A typed field reference with phantom types for compile-time safety.

The first type parameter (`model`) ensures this field belongs to a specific model.
The second type parameter (`value`) ensures operations use the correct value type.

Field constructors are generated in `Generated.Database.<ModelName>` modules.
Each Field carries its encoder to enable type-safe value encoding.

-}
type Field model value
    = Field String (value -> Encode.Value)


{-| Filter expression AST for building complex WHERE clauses.

The phantom type parameter ensures all expressions in an `and`/`or` group
belong to the same model.

-}
type FilterExpr model
    = Eq String Encode.Value
    | Neq String Encode.Value
    | Gt String Encode.Value
    | Gte String Encode.Value
    | Lt String Encode.Value
    | Lte String Encode.Value
    | Like String String
    | ILike String String
    | IsNull String
    | IsNotNull String
    | In String (List Encode.Value)
    | And (List (FilterExpr model))
    | Or (List (FilterExpr model))
    | Not (FilterExpr model)


{-| Sort expression for ORDER BY clauses.

The phantom type ensures sorting by fields from the correct model.

-}
type SortExpr model
    = SortAsc String
    | SortDesc String



-- COMPARISON OPERATORS


{-| Equal comparison: `field = value`

    Blog.title |> Q.eq "Hello World"
    -- Generates: title = 'Hello World'

-}
eq : value -> Field model value -> FilterExpr model
eq value (Field fieldName encoder) =
    Eq fieldName (encoder value)


{-| Not equal comparison: `field <> value`

    Blog.status |> Q.neq "draft"

-}
neq : value -> Field model value -> FilterExpr model
neq value (Field fieldName encoder) =
    Neq fieldName (encoder value)


{-| Greater than comparison: `field > value`

    Blog.viewCount |> Q.gt 100
    -- Generates: view_count > 100

-}
gt : comparable -> Field model comparable -> FilterExpr model
gt value (Field fieldName encoder) =
    Gt fieldName (encoder value)


{-| Greater than or equal comparison: `field >= value`

    Blog.createdAt |> Q.gte startTimestamp

-}
gte : comparable -> Field model comparable -> FilterExpr model
gte value (Field fieldName encoder) =
    Gte fieldName (encoder value)


{-| Less than comparison: `field < value`

    Blog.viewCount |> Q.lt 1000

-}
lt : comparable -> Field model comparable -> FilterExpr model
lt value (Field fieldName encoder) =
    Lt fieldName (encoder value)


{-| Less than or equal comparison: `field <= value`

    Blog.createdAt |> Q.lte endTimestamp

-}
lte : comparable -> Field model comparable -> FilterExpr model
lte value (Field fieldName encoder) =
    Lte fieldName (encoder value)



-- STRING OPERATORS


{-| SQL LIKE pattern matching (case-sensitive)

    Blog.title |> Q.like "%Elm%"
    -- Generates: title LIKE '%Elm%'

Use `%` for multi-character wildcard and `_` for single-character wildcard.

-}
like : String -> Field model String -> FilterExpr model
like pattern (Field fieldName _) =
    Like fieldName pattern


{-| SQL ILIKE pattern matching (case-insensitive, PostgreSQL)

    Blog.title |> Q.ilike "%elm%"
    -- Generates: title ILIKE '%elm%'

-}
ilike : String -> Field model String -> FilterExpr model
ilike pattern (Field fieldName _) =
    ILike fieldName pattern



-- NULL CHECKS


{-| Check if a nullable field is NULL

    Blog.deletedAt |> Q.isNull
    -- Generates: deleted_at IS NULL

-}
isNull : Field model (Maybe a) -> FilterExpr model
isNull (Field fieldName _) =
    IsNull fieldName


{-| Check if a nullable field is NOT NULL

    Blog.image |> Q.isNotNull
    -- Generates: image IS NOT NULL

-}
isNotNull : Field model (Maybe a) -> FilterExpr model
isNotNull (Field fieldName _) =
    IsNotNull fieldName



-- SET OPERATORS


{-| Check if value is in a list: `field IN (values...)`

    Blog.status |> Q.in_ [ "published", "featured" ]
    -- Generates: status IN ('published', 'featured')

-}
in_ : List value -> Field model value -> FilterExpr model
in_ values (Field fieldName encoder) =
    In fieldName (List.map encoder values)



-- LOGICAL OPERATORS


{-| Combine multiple expressions with AND

    Q.and
        [ Blog.viewCount |> Q.gt 100
        , Blog.deletedAt |> Q.isNull
        , Blog.title |> Q.like "%Elm%"
        ]
    -- Generates: (view_count > 100 AND deleted_at IS NULL AND title LIKE '%Elm%')

-}
and : List (FilterExpr model) -> FilterExpr model
and exprs =
    And exprs


{-| Combine multiple expressions with OR

    Q.or
        [ Blog.title |> Q.like "%Elm%"
        , Blog.extract |> Q.like "%Elm%"
        ]
    -- Generates: (title LIKE '%Elm%' OR extract LIKE '%Elm%')

-}
or : List (FilterExpr model) -> FilterExpr model
or exprs =
    Or exprs


{-| Negate an expression with NOT

    Q.not_ (Blog.status |> Q.eq "draft")
    -- Generates: NOT (status = 'draft')

-}
not_ : FilterExpr model -> FilterExpr model
not_ expr =
    Not expr



-- SORT OPERATORS


{-| Sort ascending by field

    Q.asc Blog.createdAt
    -- Generates: ORDER BY created_at ASC

-}
asc : Field model value -> SortExpr model
asc (Field fieldName _) =
    SortAsc fieldName


{-| Sort descending by field

    Q.desc Blog.createdAt
    -- Generates: ORDER BY created_at DESC

-}
desc : Field model value -> SortExpr model
desc (Field fieldName _) =
    SortDesc fieldName



-- ENCODING


{-| Encode a FilterExpr to JSON for transmission to the runtime.

The runtime translates this AST into parameterized SQL.

-}
encodeFilterExpr : FilterExpr model -> Encode.Value
encodeFilterExpr expr =
    case expr of
        Eq field value ->
            Encode.object
                [ ( "type", Encode.string "Eq" )
                , ( "field", Encode.string field )
                , ( "value", value )
                ]

        Neq field value ->
            Encode.object
                [ ( "type", Encode.string "Neq" )
                , ( "field", Encode.string field )
                , ( "value", value )
                ]

        Gt field value ->
            Encode.object
                [ ( "type", Encode.string "Gt" )
                , ( "field", Encode.string field )
                , ( "value", value )
                ]

        Gte field value ->
            Encode.object
                [ ( "type", Encode.string "Gte" )
                , ( "field", Encode.string field )
                , ( "value", value )
                ]

        Lt field value ->
            Encode.object
                [ ( "type", Encode.string "Lt" )
                , ( "field", Encode.string field )
                , ( "value", value )
                ]

        Lte field value ->
            Encode.object
                [ ( "type", Encode.string "Lte" )
                , ( "field", Encode.string field )
                , ( "value", value )
                ]

        Like field pattern ->
            Encode.object
                [ ( "type", Encode.string "Like" )
                , ( "field", Encode.string field )
                , ( "value", Encode.string pattern )
                ]

        ILike field pattern ->
            Encode.object
                [ ( "type", Encode.string "ILike" )
                , ( "field", Encode.string field )
                , ( "value", Encode.string pattern )
                ]

        IsNull field ->
            Encode.object
                [ ( "type", Encode.string "IsNull" )
                , ( "field", Encode.string field )
                ]

        IsNotNull field ->
            Encode.object
                [ ( "type", Encode.string "IsNotNull" )
                , ( "field", Encode.string field )
                ]

        In field values ->
            Encode.object
                [ ( "type", Encode.string "In" )
                , ( "field", Encode.string field )
                , ( "values", Encode.list identity values )
                ]

        And exprs ->
            Encode.object
                [ ( "type", Encode.string "And" )
                , ( "exprs", Encode.list encodeFilterExpr exprs )
                ]

        Or exprs ->
            Encode.object
                [ ( "type", Encode.string "Or" )
                , ( "exprs", Encode.list encodeFilterExpr exprs )
                ]

        Not subExpr ->
            Encode.object
                [ ( "type", Encode.string "Not" )
                , ( "expr", encodeFilterExpr subExpr )
                ]


{-| Encode a SortExpr to JSON for transmission to the runtime.
-}
encodeSortExpr : SortExpr model -> Encode.Value
encodeSortExpr sortExpr =
    case sortExpr of
        SortAsc field ->
            Encode.object
                [ ( "field", Encode.string field )
                , ( "direction", Encode.string "asc" )
                ]

        SortDesc field ->
            Encode.object
                [ ( "field", Encode.string field )
                , ( "direction", Encode.string "desc" )
                ]



