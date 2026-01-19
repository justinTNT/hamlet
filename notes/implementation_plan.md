# Implementation Plan - Rust to Elm Model Migration

We will move the "Source of Truth" for our database schema from Rust structs (`app/horatio/models/*.rs`) to Elm type aliases (`app/horatio/web/src/Schema/*.elm`). This allows us to delete the "Legacy" Rust schema layer and use transparent Elm types that are ergonomic for the frontend.

# Goal Description
Use `elm-rs`-style semantics (Transparent Aliases) in native Elm files to define the database schema, and update the `buildamp` generator to parse these Elm files instead of Rust files.

## User Review Required
> [!IMPORTANT]
> **Location Change**: Implementation moves models from `app/horatio/models/` (Rust) to `app/horatio/web/src/Schema/` (Elm). This ensures they are compiled by the Elm compiler as valid code.

## Proposed Changes

### 1. Framework Definition (Elm)

#### [NEW] [Schema.elm](file:///Users/jtnt/Play/hamlet/app/horatio/web/src/Framework/Schema.elm)
Defines the "Gestures" (markers):
- `BuildampHost` (Tenancy) -> Generator adds `WHERE host = ?`
- `SoftDelete` (Trash) -> Generator adds `kill` / `deleted_at` logic
- `Secret` (Encryption) -> (Future)

#### [NEW] [Database.elm](file:///Users/jtnt/Play/hamlet/app/horatio/web/src/Framework/Database.elm)
Defines the **Type-Safe Query Builder** (Phantom Types):
- `type Field model value` (Tracks Model and Type safety)
- `type Filter model` (The AST sent to Node.js)
- Operators: `eq`, `gt`, `like`, `and`, `or`

### 2. Generator Update (Node.js)

#### [MODIFY] `packages/buildamp`
1.  **Static CRUD**: Generate `insert`, `update`, `getById`, `delete` using strict SQL (no runtime builder).
2.  **Schema Parser**: Detect `BuildampHost` and `SoftDelete` to inject isolation logic into Static CRUD.
3.  **Field Accessors**: For Every Model, generate generic `Field` values:
    ```elm
    -- Generated in Schema/MicroblogItem.elm
    viewCount : Field MicroblogItem Int
    viewCount = Field "view_count"
    ```

#### [MODIFY] `packages/hamlet-server/middleware/elm-service.js`
- **Harden** `translateQueryToSQL`.
- Make it strictly strictly match the `Database.elm` Filter AST.
- Remove loose JSON parsing; expect a rigid structure from Elm.

### 3. Model Migration
Convert existing Rust models to Elm.

#### [NEW] [MicroblogItem.elm](file:///Users/jtnt/Play/hamlet/app/horatio/web/src/Schema/MicroblogItem.elm)
```elm
module Schema.MicroblogItem exposing (MicroblogItem)

import Framework.Schema exposing (..)

type alias MicroblogItem =
    { id : DatabaseId String
    , title : String
    , link : Link String
    , viewCount : Int
    , createdAt : Timestamp
    }
```

#### [DELETE] Rust Models
- `app/horatio/models/db/*.rs`
- `src/framework/database_types.rs` (Eventually)

## Verification Plan

### Automated Tests
1.  **Migration Diff**: Run `buildamp gen:sql` before and after changes. The output `schema.sql` MUST be identical (or semantically equivalent).
2.  **Elm Compiler**: Run `elm make` to ensure the new Schema definitions are valid Elm code.
3.  **Runtime**: Start the app and verify `MicroblogItem` still loads from DB.

### Manual Verification
- Inspect generated `Generated/Database.elm` to ensure it still produces the correct Encoders/Decoders.
