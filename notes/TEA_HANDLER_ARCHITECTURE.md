# TEA Handler Architecture

**STATUS**: Design document - captures agreements on async handler architecture

**PRIORITY**: Critical - solves fundamental async handler problem

## The Problem: Sync Functions in an Async World

### Current Handler Limitation
```elm
-- Current: Sync function, can't await anything
handleSubmitItem : SubmitItemReq -> SubmitItemRes
handleSubmitItem request =
    { item = placeholderItem } -- Can't await database, webhooks, etc.
```

### What Real Business Workflows Need
- Database operations (async)
- External API calls / webhooks (async)  
- File processing (async)
- Email sending (async)
- Multi-step workflows with dependencies
- SSE event emission after operations complete

### Why This Breaks Everything
1. **Handlers can't do real work** - No way to await async operations
2. **Webhooks can't be integrated** - HTTP calls are async but handlers are sync
3. **SSE becomes disconnected** - When do you emit events if handlers finish immediately?
4. **Database operations become painful** - No way to compose async database calls
5. **Background processing becomes mandatory** - Can't choose immediate vs background execution

## The Solution: TEA = Natural Async Task System

### Core Insight
**If handlers become full TEA systems, they get all async capabilities through `Cmd` and `Sub`.**

Instead of sync functions, handlers become **async state machines**:

```elm
-- Handler as TEA program
type alias Model = HandlerState
type Msg = AsyncOperationResult | ...

init : RequestType -> (Model, Cmd Msg)     -- Start async workflow
update : Msg -> Model -> (Model, Cmd Msg)  -- Handle async results
```

### TEA → Handler Architecture Mapping

| **TEA Concept** | **Handler Equivalent** | **Purpose** |
|-----------------|----------------------|-------------|
| **Model** | Processing state | Track workflow progress |  
| **Msg** | Operation results | Async completion signals |
| **init** | Request intake | Start processing |
| **update** | Business logic | State transitions |
| **Cmd** | Side effects | Database, webhooks, SSE |
| **Sub** | Result channels | Async responses |
| **View** | Response generation | Transform state to output |

### Natural Async Composition Examples

**Database + Webhook + SSE workflow:**
```elm
type ProcessingStage = InsertingItem | SendingWebhook | EmittingSSE | Complete

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        ItemInserted (Ok item) ->
            ( { model | stage = SendingWebhook, item = Just item }
            , Webhooks.send "email-service" item
            )
            
        WebhookSent (Ok response) ->
            ( { model | stage = EmittingSSE }
            , SSE.emit "itemCreated" { itemId = model.item.id }
            )
            
        SSEEmitted ->
            ( { model | stage = Complete }
            , BuildAmp.returnResponse { item = model.item, processed = True }
            )
```

**Error handling:**
```elm
update msg model =
    case msg of
        ItemInserted (Err error) ->
            ( { model | stage = Complete }
            , Cmd.batch
                [ SSE.emit "error" { message = "Database failed" }
                , BuildAmp.returnError error
                ]
            )
```

**Background vs immediate execution choice:**
```elm
update msg model =
    case msg of
        ItemInserted (Ok item) ->
            -- Dev explicitly chooses execution strategy
            ( { model | stage = SendingWebhook }
            , Webhooks.send "email-service" item  -- Immediate async
            )
            
        -- Or alternatively, for long-running operations:
        -- ( { model | stage = Complete }
        -- , Cmd.batch
        --     [ Events.schedule "ProcessVideo" item  -- Explicit background
        --     , BuildAmp.returnResponse { item = item, status = "scheduled" }
        --     ]
        -- )
```

## Generated Handler Scaffolding

### Design Principles
- **Guide, don't solve** - Provide structure, dev writes business logic
- **Preserve Elm joy** - Dev wants to write Elm, not learn framework
- **TEA-aware, not TEA-prescribed** - Gentle nudge toward pattern
- **Simple cases stay simple** - No pollution for sync responses

### Generated Scaffold Structure

```elm
-- Auto-generated minimal TEA structure for SubmitItemHandler

type alias ProcessingStage = Done

type alias Model = 
    { request : SubmitItemReq
    , state : ()
    , stage : ProcessingStage
    , globalState : GlobalState
    }

type Msg 
    = ResponseReady SubmitItemRes

init : GlobalConfig -> GlobalState -> SubmitItemReq -> (Model, Cmd Msg)
init config globalState request = 
    ( { request = request, state = (), stage = Done, globalState = globalState }
    , Task.succeed (generateResponse request) |> Task.perform ResponseReady
    )

update : GlobalConfig -> Msg -> Model -> (Model, Cmd Msg)  
update config msg model =
    case msg of
        ResponseReady response ->
            ( model, BuildAmp.returnResponse response )

generateResponse : SubmitItemReq -> SubmitItemRes
generateResponse request =
    { item = placeholderItem }
```

### Pedagogical Value of Structure

**The `req + state + stage + globalState` pattern teaches:**
1. **`request`** → "You have access to all input data"
2. **`state`** → "You can accumulate results from async operations"  
3. **`stage`** → "You can track progress through workflow steps"
4. **`globalState`** → "You can read and mutate shared application state"

**The working flow through `update` teaches:**
- TEA patterns (even simple cases use init → update flow)
- Response mechanism (how Services.returnResponse works)
- Evolution path (add more Msg cases for async operations)
- Structure is self-documenting (no TODO comments needed)

**GlobalConfig vs GlobalState separation:**
- **Config as parameter** → Read-only, available in update function
- **State in Model** → Mutable through standard TEA patterns
- **Type safety** → Compiler tracks all global state changes
- **Pure Elm** → No special mutation APIs, just normal Model updates

### Natural Evolution Path

**Simple sync case:**
```elm
-- Stage stays Done, return immediately  
type alias ProcessingStage = Done
init config globalState request = (model, Task.succeed (generateResponse request) |> Task.perform ResponseReady)
```

**Single async operation:**
```elm
-- Add one stage, one transition
type alias ProcessingStage = WaitingForDatabase | Done
init config globalState request = (model, DB.insertItem (itemFromRequest request))
```

**Complex workflow:**
```elm
-- Grow stages naturally as workflow complexity increases
type alias ProcessingStage = 
    ValidatingInput | InsertingItem | SendingWebhook | EmittingSSE | Done
```

## Port Module Architecture

### Problem: Don't Generate Ports Per Handler
**Avoid duplication and assumptions:**
```elm
-- Don't generate this in every handler
port insertItem : ItemData -> Cmd msg
port itemInserted : (Result Error Item -> msg) -> Sub msg
```

### Solution: Capability-Based Port Modules

**Generate separate modules for each capability:**
```elm
-- Auto-generated: Generated/BuildAmp/Ports.elm (always present)
port module Generated.BuildAmp.Ports exposing (..)

port returnResponse : responseType -> Cmd msg
port returnError : String -> Cmd msg
```

```elm
-- Auto-generated: Generated/Database/Ports.elm (classic case)
port module Generated.Database.Ports exposing (..)

port insertMicroblogItem : MicroblogItemData -> Cmd msg
port microblogItemInserted : (Result Error MicroblogItem -> msg) -> Sub msg

port insertGuest : GuestData -> Cmd msg  
port guestInserted : (Result Error Guest -> msg) -> Sub msg
```

```elm
-- Auto-generated: Generated/SSE/Ports.elm (optional capability)
port module Generated.SSE.Ports exposing (..)

port emit : SSEEvent -> Cmd msg
port emitted : (() -> msg) -> Sub msg
```

```elm
-- Auto-generated: Generated/Session/Ports.elm (per-session state)
port module Generated.Session.Ports exposing (..)

port set : String -> Value -> Cmd msg
port get : String -> Cmd msg
port received : (Maybe Value -> msg) -> Sub msg
port remove : String -> Cmd msg
```

```elm
-- Auto-generated: Generated/KVStore/Ports.elm (shared server state)
port module Generated.KVStore.Ports exposing (..)

port set : String -> Value -> Cmd msg
port get : String -> Cmd msg
port received : (Maybe Value -> msg) -> Sub msg
port remove : String -> Cmd msg
```

```elm
-- Auto-generated: Generated/Services/Ports.elm (external APIs)  
port module Generated.Services.Ports exposing (..)

port call : ServiceRequest -> Cmd msg
port response : (Result Error ServiceResponse -> msg) -> Sub msg
```

**Handlers import only what they need:**
```elm
-- Classic database app - our sweet spot
import Generated.BuildAmp.Ports as BuildAmp
import Generated.Database.Ports as DB

init config globalState request = (model, DB.insertMicroblogItem (itemFromRequest request))
update config (ItemInserted (Ok item)) model = (model, BuildAmp.returnResponse { item = item })
```

```elm
-- App with global state and config access
import Generated.BuildAmp.Ports as BuildAmp
import Generated.Database.Ports as DB  
import Generated.GlobalConfig exposing (GlobalConfig)
import Generated.GlobalState exposing (GlobalState)

update : GlobalConfig -> Msg -> Model -> (Model, Cmd Msg)
update config msg model =
    case msg of
        ItemInserted (Ok item) ->
            let
                isFeatureEnabled = config.enableNewFeature
                updatedGlobalState = 
                    { model.globalState | itemCount = model.globalState.itemCount + 1 }
            in
            ( { model | stage = Complete, globalState = updatedGlobalState }
            , BuildAmp.returnResponse { item = item, totalItems = updatedGlobalState.itemCount }
            )
```

```elm
-- E-commerce app with session state
import Generated.BuildAmp.Ports as BuildAmp  
import Generated.Database.Ports as DB
import Generated.Session.Ports as Session

update config (ItemAdded item) model = 
    ( model
    , Cmd.batch
        [ DB.insertItem item
        , Session.set "cart_count" (model.cartCount + 1)
        ]
    )
```

```elm
-- Complex app with weirdly shaped holes
import Generated.BuildAmp.Ports as BuildAmp
import Generated.Database.Ports as DB
import Generated.Session.Ports as Session
import Generated.KVStore.Ports as KV
import Generated.SSE.Ports as SSE
import Generated.Services.Ports as Services
import Generated.Events.Ports as Events

-- Multiple capabilities explicitly declared
```

### Benefits
- ✅ **No duplication** → Ports defined once per capability
- ✅ **Explicit dependencies** → Handler imports declare exactly what it does  
- ✅ **No bloat** → Simple handlers don't import unused capabilities
- ✅ **Small app friendly** → Apps without SSE/Services don't generate those ports
- ✅ **Sweet spot optimization** → Classic database apps stay clean and obvious
- ✅ **Session isolation** → Session operations automatically scoped to current request

## Integration with Existing Systems

### SSE Integration
```elm
-- Import optional SSE capability when needed
import Generated.SSE.Ports as SSE

update (WebhookComplete response) model =
    ( { model | stage = NotifyingClients }
    , SSE.emit "itemProcessed" 
        { itemId = model.item.id
        , result = response.status
        }
    )
```

### Webhook Integration  
```elm
-- Import optional webhook capability when needed
import Generated.Webhooks.Ports as Webhooks

update (ItemCreated item) model =
    ( { model | stage = SendingWebhooks }
    , Cmd.batch
        [ Webhooks.send "email-service" { itemId = item.id }
        , Webhooks.send "analytics" { event = "item_created" }
        ]
    )
```

### Background Event Integration
```elm
-- Import optional event scheduling capability when needed
import Generated.Events.Ports as Events

update (ItemCreated item) model =
    case model.request.processingType of
        Immediate ->
            -- Process file immediately
            ( { model | stage = ProcessingFile }
            , Files.process item.fileId
            )
            
        Scheduled ->
            -- Schedule for background processing  
            ( { model | stage = Complete }
            , Cmd.batch
                [ Events.schedule "ProcessVideo" { fileId = item.fileId }
                , BuildAmp.returnResponse { item = item, status = "scheduled" }
                ]
            )
```

## Architectural Benefits

### 1. **Reinforces Existing Knowledge**
- Dev already knows TEA (The Elm Architecture)
- No new concepts to learn - just apply familiar patterns
- One powerful pattern scales from simple to complex

### 2. **Natural Async Composition**
- Wait for multiple operations using familiar Elm patterns
- Handle partial failures gracefully through `update` function
- Emit SSE events at any stage of processing
- Choose immediate vs background execution per operation

### 3. **Simple Cases Stay Simple**
- Sync responses: trivial `init` with immediate `returnResponse`  
- No architectural overhead for simple handlers
- Natural evolution as requirements grow

### 4. **Framework Becomes Invisible**
- Feels like writing normal Elm applications
- Framework provides infrastructure (ports, types) not patterns
- Dev focuses on business logic and state modeling

### 5. **Preserves Elm Joy**
- Dev gets to architect their state machines
- Dev designs their workflows and business logic
- Framework eliminates JSON/port boilerplate, not creativity

## Implementation Plan

### Phase 1: Handler Scaffold Generation
- ✅ Update `.buildamp/generation/elm_handlers.js` to generate TEA structure
- ✅ Generate minimal `req + state + stage` model pattern
- ✅ Include working `returnResponse` command for immediate functionality
- ✅ Add reference templates in `templates/handlers/` for common patterns

### Phase 2: State & Port Module Generation
- ✅ Generate `Generated/GlobalConfig.elm` and `Generated/GlobalState.elm` (initialize as `{}`)
- ✅ Generate `Generated/Database/Ports.elm` from database models
- ✅ Generate `Generated/Session/Ports.elm` for per-session state
- ✅ Generate `Generated/KVStore/Ports.elm` for shared server state
- ✅ Generate `Generated/SSE/Ports.elm` for real-time notifications
- ✅ Generate `Generated/Services/Ports.elm` for external API calls
- ✅ Generate `Generated/Events/Ports.elm` for background scheduling
- ✅ Update JavaScript runtime to wire ports to actual implementations

### Phase 3: Runtime Infrastructure
- ✅ Update `elm-service.js` to manage TEA handler lifecycles
- ✅ Implement completion detection:
  - Route handlers: `BuildAmp.returnResponse`/`BuildAmp.returnError` signals HTTP response
  - Event handlers: `Cmd.none` signals event processing complete
  - Webhook handlers: `Cmd.none` signals webhook acknowledgment (HTTP 200)
- ✅ Add middleware for each capability port wiring
- ✅ Event sourcing pattern management for event handler errors

### Phase 4: Integration & Migration
- ✅ Migrate existing handlers to new TEA structure
- ✅ Update SSE system to work with handler-driven events
- ✅ Implement webhook system with port-based integration
- ✅ Connect background event scheduling

## Success Criteria

### Developer Experience
- [ ] Simple sync handlers require minimal code (< 5 lines in `init`)
- [ ] Complex async workflows feel natural (standard Elm patterns)
- [ ] Documentation shows clear progression from simple → complex
- [ ] Reference templates demonstrate common patterns

### Technical Capabilities  
- [ ] Handlers can await multiple async operations
- [ ] Webhook calls integrate seamlessly with business logic
- [ ] SSE events emit at appropriate workflow stages  
- [ ] Background processing choice is dev-controlled
- [ ] Error handling works through normal Elm patterns

### Architectural Integrity
- [ ] No business logic in JavaScript layer
- [ ] "Rust once, JSON never" principle maintained
- [ ] Framework feels invisible to dev users
- [ ] Elm patterns reinforced, not replaced
- [ ] GlobalConfig and GlobalState both initialize as `{}` - application defines structure
- [ ] GlobalConfig is read-only (parameter), GlobalState is mutable (part of Model)
- [ ] Pure TEA patterns for global state mutations - no special APIs needed
- [ ] Event handlers integrate with event sourcing pattern (retry/failure management)
- [ ] Webhook error handling is application responsibility
- [ ] Middleware approach for all capability port wiring

## Complete State & Capability Architecture Summary

### State Layers (Choose What You Need):
- **GlobalConfig** - read-only configuration (parameter to update function)
- **GlobalState** - mutable shared state (part of Model, updated through TEA)
- **Session** - per-session state (automatic isolation) 
- **KVStore** - shared server state with TTL (survives Elm restarts)
- **Database** - persistent data (sweet spot)

### Capabilities (Import Only What You Use):
- **BuildAmp** - core response/logging primitives (always present)
- **Services** - external API calls
- **SSE** - real-time notifications  
- **Events** - background scheduling

### Generation Sources:
- Application-defined GlobalConfig and GlobalState (initialize as `{}`)
- `src/models/db/` → Database operations
- `src/models/api/` → Route handlers  
- `src/models/events/` → Event handlers
- `src/models/webhooks/` → Webhook handlers

### Handler Types (All Use Same TEA Shape):
- **Route handlers** - HTTP request → response (completion: `BuildAmp.returnResponse`)
- **Event handlers** - Background work → side effects only (completion: `Cmd.none`)
- **Webhook handlers** - Incoming webhook → side effects only (completion: `Cmd.none`)

## Notes

This architecture solves the fundamental async handler problem by embracing Elm's natural strengths rather than fighting them. The result is a system that feels familiar to Elm developers while providing powerful async composition capabilities.

The key insight is that TEA already *is* an async task system - we just need to apply it at the handler level rather than the application level.