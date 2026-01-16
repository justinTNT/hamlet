# Phase 4: Cross-Model References & Type-Safe Caching

## Status: COMPLETE

- [x] Cross-model reference parsing (`parseCrossModelReferences`)
- [x] DB model metadata loading (`loadDbModelMetadata`)
- [x] Storage generator: cache primitives for db refs
- [x] KV generator: cache functions for db refs
- [x] Tests for cross-model parsing
- [x] API generator: cross-module imports for db refs
- [x] SSE generator: cross-module imports for db/api refs
- [x] Document store-building pattern (below)

## Overview

Enable DB models to be referenced by other interfaces (storage, kv, sse, api) with proper type safety and Elm import generation.

---

## Cross-Model Reference Patterns

| From | To | Treatment |
|------|-----|-----------|
| db | storage | MAPPED: generates cache primitives |
| db | kv | MAPPED: generates cache primitives |
| db | api | UNMAPPED: just emit Elm imports |
| db | sse | UNMAPPED: just emit Elm imports |
| api | sse | UNMAPPED: just emit Elm imports |

### Declaration

Reference is declared via standard Rust `use`:

```rust
// models/storage/caches.rs
use crate::models::db::MicroblogItem;
use crate::models::db::ItemComment;
```

The generator sees DB types referenced in storage/kv → generates cache primitives.

For api/sse, the generator just emits correct Elm imports.

---

## Cache Primitives (storage/kv → db)

When a DB model is referenced in storage or kv, generate:

```elm
module Storage.MicroblogItem exposing (store, load, remove, clear, onLoaded)

store   : MicroblogItem -> Cmd msg              -- keys by item.id
load    : DatabaseId MicroblogItem -> Cmd msg   -- request by id
remove  : DatabaseId MicroblogItem -> Cmd msg   -- remove by id
clear   : Cmd msg                               -- remove all of this type
onLoaded : (Maybe MicroblogItem -> msg) -> Sub msg
```

Same pattern for KV (server-side).

### Key Design Decisions

1. **DatabaseId as key type**: Reuses existing `DatabaseId a` phantom type for type-safe keys
2. **store extracts id automatically**: `store item` uses `item.id` - no need to pass id separately
3. **No annotation needed**: The `use` statement is the declaration of intent

---

## What We're NOT Building

This is a **dumb type-aware cache**, not an ORM or store:

| YES | NO |
|-----|-----|
| store/load/remove one item | loadAll / list collections |
| clear all of a type | relationship-aware loading |
| explicit operations | automatic cache population |
| dev controls everything | cache intercepting API |
| | smart invalidation |
| | query interface |

The 90% case: simple primitives.
The 10% case: dev can build a store on top (document the pattern, don't generate it).

---

## Unmapped Cross-References

For db → api, db → sse, api → sse, no special primitives. Just:

1. Generator recognizes `use crate::models::db::X` or `use crate::models::api::X`
2. Emits correct Elm import: `import Generated.Db exposing (MicroblogItem)`
3. Type is used as-is in the composed structure

Example:
```rust
// models/api/get_item.rs
use crate::models::db::MicroblogItem;

pub struct GetItemResponse {
    pub item: MicroblogItem,
}
```

Generates:
```elm
module Generated.Api exposing (..)

import Generated.Db exposing (MicroblogItem)

type alias GetItemResponse =
    { item : MicroblogItem }
```

---

## Implementation Tasks

1. ~~**Update storage generator** to detect db model references and generate cache primitives~~ ✅
2. ~~**Update kv generator** same as storage~~ ✅
3. ~~**Add tests** for cross-model import resolution~~ ✅
4. ~~**Update API/SSE generators** to emit cross-module imports~~ ✅
5. ~~**Document** the pattern for building a store on top of cache primitives~~ ✅

---

## Building a Store on Cache Primitives

The generated cache primitives are intentionally simple. For the 10% of cases where you need more sophisticated caching (collections, queries, etc.), build a thin store layer on top.

### Example: Item Store (Elm)

```elm
module ItemStore exposing (Store, empty, get, set, remove, getAll)

import Dict exposing (Dict)
import Generated.Storage.MicroblogItemCache as Cache
import Generated.Db exposing (MicroblogItemDb)

-- In-memory store that syncs with browser cache
type alias Store =
    { items : Dict String MicroblogItemDb
    , loading : Set String
    }

empty : Store
empty =
    { items = Dict.empty
    , loading = Set.empty
    }

-- Get from local store (call Cache.load to refresh from storage)
get : String -> Store -> Maybe MicroblogItemDb
get id store =
    Dict.get id store.items

-- Set in local store AND persist to cache
set : MicroblogItemDb -> Store -> ( Store, Cmd msg )
set item store =
    ( { store | items = Dict.insert item.id item store.items }
    , Cache.store item
    )

-- Remove from local store AND cache
remove : String -> Store -> ( Store, Cmd msg )
remove id store =
    ( { store | items = Dict.remove id store.items }
    , Cache.remove id
    )

-- Get all items in local store
getAll : Store -> List MicroblogItemDb
getAll store =
    Dict.values store.items

-- Handle cache load result
onLoaded : Maybe MicroblogItemDb -> Store -> Store
onLoaded maybeItem store =
    case maybeItem of
        Just item ->
            { store | items = Dict.insert item.id item store.items }

        Nothing ->
            store
```

### Key Patterns

1. **Local State + Cache Sync**: Keep a `Dict` in your model, sync to cache on mutations
2. **Explicit Loading**: User triggers `Cache.load`, handle result in `onLoaded`
3. **No Magic**: Cache is just storage - you control when to read/write
4. **Type Safety**: All operations use `DatabaseId` for keys

### When to Build a Store

- You need to hold multiple items in memory
- You want collection operations (getAll, filter, etc.)
- You need to batch cache operations
- You want optimistic UI updates

### When Cache Primitives Are Enough

- Caching single items (current user session, selected item)
- Simple key-value scenarios
- Cases where you load-use-discard

---

## Depends On

- Phase 3 Sprint 1-3 (complete): CLI cleanup, SQL generator, FK validation, schema introspection

## Related

- `notes/phase3-cli-cleanup-sprints.md` - CLI and SQL work (complete)
- `notes/admin_ui_plan.md` - Admin UI now schema-driven via schema.json
