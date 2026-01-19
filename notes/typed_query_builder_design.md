# Design: The Type-Safe Query Builder (Phantom Types)

This design enables "highly expressive composition" while preventing invalid queries (like comparing strings to integers) at compile time.

## The Core Idea
We use **Phantom Types** to track:
1.  Which **Model** the field belongs to (so you can't query `User` fields on a `Post`).
2.  What **Type** the field holds (so you can't compare `Int` fields to `String`).

## 1. Framework Definitions (Framework/Database.elm)

```elm
module Framework.Database exposing (..)

-- THE PHANTOM TYPE
-- 'model': The record type this field belongs to (e.g. MicroblogItem)
-- 'value': The type of data in this field (e.g. String, Int)
type Field model value = Field String

-- THE FILTER AST
-- This is what we send to the port
type Filter model
    = And (List (Filter model))
    | Or (List (Filter model))
    | Eq String String  -- field_name, serialized_value
    | Gt String String
    | Lt String String
    -- ... etc

-- OPERATORS (Type Safe!)

{-| Equality: Field type 'a' must match value type 'a' -}
eq : Field model a -> a -> Filter model
eq (Field name) val = 
    Eq name (toString val) -- (In reality, use a JSON Encoder)

{-| Greater Than: Only works for comparable types (Int, Float, Time) -}
gt : Field model comparable -> comparable -> Filter model
gt (Field name) val = 
    Gt name (toString val)

{-| Like: Only works for Strings -}
like : Field model String -> String -> Filter model
like (Field name) pattern = 
    Like name pattern
```

## 2. Generated Code (Schema/MicroblogItem.elm)

The generator creates these "Accessors" automatically.

```elm
module Schema.MicroblogItem exposing (..)

import Framework.Database exposing (Field(..))

type alias MicroblogItem = 
    { id : String, viewCount : Int, ... }

-- Generated Fields (The "Accessors")
id : Field MicroblogItem String
id = Field "id"

title : Field MicroblogItem String
title = Field "title"

viewCount : Field MicroblogItem Int
viewCount = Field "view_count"
```

## 3. Usage (The Result)

```elm
import Framework.Database as Db exposing (eq, gt, like)
import Schema.MicroblogItem as Blog

-- COMPILES
validQuery = 
    Db.find Blog.table
        (Db.where_ (Db.and 
            [ Blog.viewCount |> gt 100        -- OK: Int vs Int
            , Blog.title |> like "%Elm%"      -- OK: String vs String
            ]))

-- COMPILER ERROR 1: Type Mismatch
invalidType = 
    Blog.viewCount |> like "%Elm%" 
    -- Error: 'like' expects (Field model String), found (Field model Int)

-- COMPILER ERROR 2: Model Mismatch
invalidModel =
    Db.find User.table
        (Db.where_ (Blog.title |> eq "Title"))
        -- Error: 'find' expects (Filter User), found (Filter MicroblogItem)
```

## The "Cost" (Runtime)
You must keep `elm-service.js` / `translateQueryToSQL`.
It must recursively parse the `Filter` AST and turn it into SQL:

```javascript
function translateFilter(filter) {
    if (filter.type === 'And') {
        return '(' + filter.filters.map(translateFilter).join(' AND ') + ')';
    }
    if (filter.type === 'Gt') {
        return `${filter.field} > $${paramIndex}`;
    }
    // ...
}
```

## Verdict
This is the **Correct** way to do a Query Builder in Elm.
It turns Runtime SQL Errors into **Compile Time Elm Errors**.
