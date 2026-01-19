module Framework.Database exposing 
    ( Field(..)
    , Filter
    , Order(..)
    , Query
    , eq, gt, lt, gte, lte, like, ilike, neq
    , and, or
    , query, where_, orderBy, limit, offset
    )

{-| Type-Safe Query Builder (Phantom Types)
This module provides the "Awesome Power" to compose safe SQL queries in Elm.
-}

-- PHANTOM TYPES

{-| A Reference to a Database Column.
`model`: The record type it belongs to (e.g. MicroblogItem)
`value`: The Elm type of the data (e.g. Int, String)
-}
type Field model value = Field String

{-| A Filter Condition for a specific Model.
Safety: You cannot mix filters from different models.
-}
type Filter model
    = And (List (Filter model))
    | Or (List (Filter model))
    | Condition String String String  -- field, op, value_serialized

type Order
    = Asc
    | Desc

type alias Query model =
    { filters : List (Filter model)
    , order : List (String, Order)
    , limit : Maybe Int
    , offset : Int
    }

-- CONSTRUCTORS

query : Query model
query =
    { filters = []
    , order = []
    , limit = Nothing
    , offset = 0
    }

where_ : Filter model -> Query model -> Query model
where_ filter q =
    { q | filters = q.filters ++ [filter] }

orderBy : Field model value -> Order -> Query model -> Query model
orderBy (Field name) dir q =
    { q | order = q.order ++ [(name, dir)] }

limit : Int -> Query model -> Query model
limit n q =
    { q | limit = Just n }

offset : Int -> Query model -> Query model
offset n q =
    { q | offset = n }

-- OPERATORS

op : String -> Field model a -> a -> Filter model
op operator (Field name) val =
    -- In a real app, we would use a proper Encoder here
    Condition name operator (Debug.toString val)

eq : Field model a -> a -> Filter model
eq = op "="

neq : Field model a -> a -> Filter model
neq = op "!="

gt : Field model comparable -> comparable -> Filter model
gt = op ">"

lt : Field model comparable -> comparable -> Filter model
lt = op "<"

gte : Field model comparable -> comparable -> Filter model
gte = op ">="

lte : Field model comparable -> comparable -> Filter model
lte = op "<="

like : Field model String -> String -> Filter model
like = op "LIKE"

ilike : Field model String -> String -> Filter model
ilike = op "ILIKE"

-- COMBINATORS

and : List (Filter model) -> Filter model
and = And

or : List (Filter model) -> Filter model
or = Or
