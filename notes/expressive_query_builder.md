# The Expressive Query Builder: Schema-Aware Type Safety

**Goal:** Empower the Elm developer with "Awesome Power" to compose complex database queries, while guaranteeing 100% Type Safety at compile time.

**Inspiration:** PostgREST / Supabase style filtering, but strictly typed via your Elm Schema.

## 1. The Core Concept: Phantom Types
The secret sauce is the `Field` type. It carries two "Ghost" (Phantom) types that don't exist at runtime but enforce safety at compile time.

```elm
-- defined in Framework/Database.elm
type Field model value = Field String
```
*   `model`: Ensures you don't mix up Tables (e.g. querying `User` fields on a `Post`).
*   `value`: Ensures you don't mix up Data Types (e.g. comparing `Int` > `String`).

## 2. The Mechanics

### Step A: The Definition (Framework/Schema.elm)
We define the "Vocabulary" of our database using simple aliases.
```elm
type alias DatabaseId a = a
type alias Timestamp = Int
type alias BuildampHost a = a
```

### Step B: The Generated Accessors (Schema/MicroblogItem.elm)
The Generator reads your Schema and creates "Typed Handles" for every column.
*   **Input**: `viewCount : Int`
*   **Output**: `viewCount : Field MicroblogItem Int`

```elm
module Schema.MicroblogItem exposing (..)

-- The Accessors (Auto-Generated)
id : Field MicroblogItem String
id = Field "id"

title : Field MicroblogItem String
title = Field "title"

viewCount : Field MicroblogItem Int
viewCount = Field "view_count"
```

### Step C: The Expressive Query (Usage)
The developer composes these handles using type-safe operators.

```elm
import Framework.Database as Db exposing (..)
import Schema.MicroblogItem as Blog

myComplexQuery : Query Blog.MicroblogItem
myComplexQuery =
    Db.query
        |> where_ (
            Db.and
                [ Blog.viewCount |> gt 100         -- VALID: Int vs Int
                , Blog.title |> like "%Elm%"       -- VALID: String vs String
                , Blog.deletedAt |> eq Nothing     -- VALID: Maybe Int vs Nothing
                ]
        )
        |> orderBy Blog.createdAt Desc
        |> limit 50
```

## 3. Why this is "Awesome"
1.  **Refactoring Safety**: If you rename `title` to `headline` in your Schema, the Generator updates the `title` accessor to `headline`. Your query code fails to compile immediately. You fix it. Zero runtime crashes.
2.  **Impossible States**: You cannot accidentally write `WHERE view_count > "ten"`. The compiler catches the `Int` vs `String` mismatch.
3.  **Composition**: You can write reusable filter functions:
    ```elm
    popular : Query MicroblogItem -> Query MicroblogItem
    popular q = q |> where_ (Blog.viewCount |> gt 1000)
    ```

## 4. The Runtime (Node.js)
The Node server simply receives a JSON AST of the filter tree and compiles it to SQL.
*   **Elm**: `Gt "view_count" "100"`
*   **Node**: `WHERE view_count > $1` (params: [100])

This gives us the "Not-a-Framework" ideal: **Node is just a dumb SQL compiler. Elm is the Brain.**
