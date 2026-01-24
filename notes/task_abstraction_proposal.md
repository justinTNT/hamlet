# Proposal: Task Abstraction for Logic Handlers

## The Problem: TEA Boilerplate

The current "Isomorphic Elm" architecture requires a full TEA (Model-Update-Msg) loop for every backend handler.
For a simple linear flow like "Insert Item -> Insert Tag -> Link", this results in:
*   A complicated `Stage` union type.
*   A `Msg` for every async result (`ItemInserted`, `TagInserted`, `TagLinked`).
*   An `update` function that essentially manually manages a call stack.
*   ~100 lines of boilerplate for 10 lines of logic.

## The Solution: `Script` Abstraction

We can introduce a `Script` type (a "Free Monad") that describes a linear sequence of async operations. A generic `Backend.Runtime` module handles the messy TEA wiring (ports, subscriptions, state) once, so you don't have to.

### The Developer Experience

Instead of writing a full TEA module, you write a **Script**:

```elm
module Api.Handlers.SubmitItem exposing (handler)

import Backend.Script as Script exposing (Script)
import Backend.Database as DB

handler : Request -> Script Response
handler req =
    Script.do
        [ DB.insert "item" (itemData req)
            |> Script.bind (\itemId ->
                Script.do 
                    (List.map (createTag itemId) req.tags)
            )
        , Script.succeed (Response.ok "Item created")
        ]

-- OR with a nicer pipeline API:

handler : Request -> Script Response
handler req =
    DB.insert "item" (itemData req)
        |> Script.andThen (\itemId -> 
            createTags itemId req.tags
                |> Script.andThen (\_ -> Script.succeed itemId)
        )
        |> Script.map (\itemId -> Response.ok { id = itemId })

```

### How it Works (Under the Hood)

We define a `Script` type that represents the *intent* to do work, not the work itself.

```elm
type Script a
    = Succeed a
    | Fail String
    | Step (Cmd Msg) (Result String Value -> Script a)
```

(Note: In reality it will be a bit more complex to handle type safety, but this is the mental model).

We provide a **Generic TEA Handler** (`Backend.Runtime`) that:
1.  Takes your `handler` function.
2.  Maintains a generic `Model` which is just `currentScript : Script`.
3.  In `update`:
    *   If current script is `Step cmd next`, it executes the `cmd`.
    *   When the port comes back (`Msg`), it feeds the result to `next` to get the new `Script`.
    *   Repeats until `Succeed` or `Fail`.

## "Before" vs "After"

### Before (Current TEA)
*   **File layout**: `Model`, `Msg`, `update`, `subscriptions` (400+ lines).
*   **Logic**: Scattered across `update` cases.
*   **State**: Explicit `Stage` management (`CreatingItem`, `LinkingTags`).

### After (Script)
*   **File layout**: Single `handler` function (~50 lines).
*   **Logic**: Linear, readable specific code.
*   **State**: Implicit (held in the closure of the continuation function).

## Recommendation

1.  Create a `packages/hamlet-server/elm/Script.elm` module.
2.  Implement the primitives: `succeed`, `fail`, `andThen`, `map`.
3.  Implement the capability wrappers: `Db.query`, `Http.get`, `Kv.set`.
4.  Update `elm-service.js` (no changes needed! The protocol remains the same).
5.  Refactor `SubmitItemHandler` to prove the concept.

## Configuration & Generation

## Configuration & Generation

## Configuration & Generation

We will use **Type Wrappers** directly in your Elm definitions.

We will provide identity types in `BuildAmp.Api`:
```elm
type alias Tea a = a
type alias Script a = a
```

You use them to "tag" your Request type:

```elm
module Api.SubmitItem exposing (..)

-- Generates full TEA handler
type alias SubmitItemReq =
    Tea { title : String }

-- Generates Script handler (Explicit)
type alias GetFeedReq =
    Script { limit : Int }

-- Generates Script handler (Implicit / Default)
type alias SimpleReq =
    { id : String }
```

**Generator Logic:**
1.  **Parse**: Inspect AST. If the type alias is a generic application of `Tea ...`, use TEA strategy.
2.  **Extract**: Unwrap the inner record to generate the encoders/decoders as normal.
3.  **Compile**: Since `Tea a = a`, this is valid Elm code that compiles away to a simple record.

This moves configuration into the **Type System** itself, which is the most "Elm" way to do it.


Using types, consistent with the existing Interface.* pattern:                                                                                        
                                                                                                                                                        
  -- models/Api/SubmitItem.elm                                                                                                                          
  module Api.SubmitItem exposing (..)                                                                                                                   
                                                                                                                                                        
  import Interface.Script exposing (Script)                                                                                                             
                                                                                                                                                        
  type alias Request =                                                                                                                                  
      { title : String                                                                                                                                  
      , link : String                                                                                                                                   
      , tags : List String                                                                                                                              
      }                                                                                                                                                 
                                                                                                                                                        
  type alias Response =                                                                                                                                 
      { id : String                                                                                                                                     
      }                                                                                                                                                 
                                                                                                                                                        
  type alias Handler = Script                                                                                                                           
                                                                                                                                                        
  -- models/Api/ComplexWorkflow.elm                                                                                                                     
  module Api.ComplexWorkflow exposing (..)                                                                                                              
                                                                                                                                                        
  import Interface.Tea exposing (Tea)                                                                                                                   
                                                                                                                                                        
  type alias Request = { ... }                                                                                                                          
  type alias Response = { ... }                                                                                                                         
                                                                                                                                                        
  type alias Handler = Tea                                                                                                                              
                                                                                                                                                        
  The generator parses the file, finds type alias Handler = Script (or Tea), and scaffolds accordingly.                                                 
                                                                                                                                                        
  Interface module definitions:                                                                                                                         
                                                                                                                                                        
  -- packages/hamlet-server/elm/Interface/Script.elm                                                                                                    
  module Interface.Script exposing (Script)                                                                                                             
                                                                                                                                                        
  type Script = Script                                                                                                                                  
                                                                                                                                                        
                                                                                                                                                        
  -- packages/hamlet-server/elm/Interface/Tea.elm                                                                                                       
  module Interface.Tea exposing (Tea)                                                                                                                   
                                                                                                                                                        
  type Tea = Tea                                                                                                                                        
                                                                                                                                                        
  These are marker types - they exist purely for the generator to detect. No runtime meaning.                                                           
                                                                                                                                                        
  Default behavior: If no Handler type alias exists, default to Tea (backwards compatible) or Script (if you want to push the simpler style).           
                                                                                                                                                        
  This fits the existing pattern where Interface.Schema marks database models. Now Interface.Script / Interface.Tea marks handler style. 


same pattern applies to backend event handlers:
                                                                                                                                                        
  -- models/Events/CommentModerated.elm
  module Events.CommentModerated exposing (..)

  import Interface.Script exposing (Script)
                                                                                                                                                        
  type alias Payload =
      { recordId : String
      , table : String
      , field : String
      , oldValue : String
      , newValue : String
      }

  type alias Handler = Script

  -- models/Events/HardDeletes.elm
  module Events.HardDeletes exposing (..)
                                                                                                                                                        
  import Interface.Tea exposing (Tea)

  type alias Payload = {}

  type alias Handler = Tea  -- Multi-stage cascade needs full TEA
                                                                                                                                                        
  The generator sees Handler = Script → scaffolds linear script style.
  The generator sees Handler = Tea → scaffolds full TEA module.
                                                                                                                                                        
  One wrinkle: Cron events are currently defined in Config/Cron.elm as a list, not individual modules:
                                                                                                                                                        
  cronEvents =
      [ { event = "HardDeletes", schedule = "23 * * * *" }
      ]
          
  we need to
           
  Split to individual modules - each event gets models/Events/HardDeletes.elm with Payload and Handler                                               
  - it's consistent with how payload events already work, and the cron schedule could move to a Meta type alias:     
                                                                                                                                                        
  -- models/Events/HardDeletes.elm                                                                                                                      
  type alias Payload = {}
  type alias Handler = Tea

  type alias Meta =
      { schedule : String }

  meta : Meta
  meta = { schedule = "23 * * * *" }

  Generator parses the meta value for cron config.

## Optimization: Runner Separation

To absolutely minimize boilerplate for the user:

1.  **User File** (`src/Api/Handlers/SubmitItem.elm`):
    *   Contains **ONLY** the logic function.
    *   No `Platform`, `ports`, `decoders`, or `main`.
    *   Just `handler : Request -> Script Response`.

2.  **Generated Runner** (`src/Api/Handlers/Generated/SubmitItemGen.elm`):
    *   **100% Generated**. Never touched by humans.
    *   Imports `Api.Handlers.SubmitItem`.
    *   Implements the dirty work: `main`, `ports`, `update` loop, `decoders`.
    *   Wraps the user's `Script` in the runtime container.

**Result**: The user's file drops from ~60 lines to ~5 lines.
