# TEA Handler Implementation Plan

**STATUS**: Implementation roadmap - detailed guidance for building TEA handler architecture

**PRIORITY**: Critical - execution plan for fundamental async handler solution

**COMPANION**: TEA_HANDLER_ARCHITECTURE.md (shows final API design)

## Design Philosophy & Constraints

### Core Principle: "Small Apps with Weirdly Shaped Holes"
**Target:** Classic database apps with occasional special needs, NOT enterprise swiss army knife frameworks.

**Sweet Spot Optimization:**
- **80% case:** HTTP request → database query → JSON response
- **15% case:** Add session state, SSE notifications, or external service calls
- **5% case:** Complex workflows with webhooks, background events, multi-step processes

**Framework Invisibility:**
- BuildAmp amplifies, doesn't impose patterns
- Elm developers write normal TEA code
- Generated code feels hand-written
- Capabilities imported only when needed

### Capability Decision Matrix

| **App Type** | **Always** | **Common** | **Rare** |
|-------------|-----------|-----------|----------|
| **Simple CRUD** | BuildAmp, Database | Session | - |
| **E-commerce** | BuildAmp, Database | Session, SSE | Services, Events |
| **Complex Workflow** | BuildAmp, Database | Services, Events | SSE |

**Implementation Rule:** Generate only what the app actually uses. No capability bloat.

## Generation Strategy

### 1. Handler Type Detection & Generation

**Current State:**
```javascript
// .buildamp/generation/elm_handlers.js - line 98
const apiRegex = /#\[buildamp_api\(path\s*=\s*"([^"]+)"[^\]]*\]\s*pub struct\s+(\w+)/g;
```

**Extension Strategy:**
```javascript
// New detection patterns
const handlerSources = [
    { 
        dir: 'src/models/api/', 
        pattern: /#\[buildamp_api\(path\s*=\s*"([^"]+)"[^\]]*\]\s*pub struct\s+(\w+)/g,
        type: 'route',
        hasResponse: true
    },
    {
        dir: 'src/models/events/',
        pattern: /pub struct\s+(\w+Event)/g,
        type: 'event', 
        hasResponse: false
    },
    {
        dir: 'src/models/webhooks/',
        pattern: /pub struct\s+(\w+Webhook)/g,
        type: 'webhook',
        hasResponse: false
    }
];
```

### 2. TEA Scaffold Template Generation

**Replace current handler template with:**
```javascript
function generateTEAHandlerContent(endpoint) {
    const { name, type, hasResponse } = endpoint;
    
    return `module Api.Handlers.${name}Handler exposing (..)

import Generated.BuildAmp.Ports as BuildAmp
import Generated.GlobalConfig exposing (GlobalConfig)
import Generated.GlobalState exposing (GlobalState)

type alias ProcessingStage = Done

type alias Model = 
    { request : ${name}Req
    , state : ()
    , stage : ProcessingStage
    , globalState : GlobalState
    }

type Msg 
    = ResponseReady ${hasResponse ? name + 'Res' : '()'}

init : GlobalConfig -> GlobalState -> ${name}Req -> (Model, Cmd Msg)
init config globalState request = 
    ( { request = request, state = (), stage = Done, globalState = globalState }
    , Task.succeed (generateResponse request) |> Task.perform ResponseReady
    )

update : GlobalConfig -> Msg -> Model -> (Model, Cmd Msg)
update config msg model =
    case msg of
        ResponseReady response ->
            ( model, ${hasResponse ? 'BuildAmp.returnResponse response' : 'Cmd.none'} )

${hasResponse ? `generateResponse : ${name}Req -> ${name}Res
generateResponse request =
    Debug.todo "Implement ${name} handler"` : ''}
`;
}
```

### 3. GlobalConfig & GlobalState Generation

**New generation files:**
```javascript
// Generate empty global types that app can extend
function generateGlobalTypes() {
    const globalConfigContent = `module Generated.GlobalConfig exposing (GlobalConfig)

-- Application-defined global configuration
-- Initialize as {} and extend as needed
type alias GlobalConfig = {}
`;

    const globalStateContent = `module Generated.GlobalState exposing (GlobalState)

-- Application-defined global state  
-- Initialize as {} and extend as needed
-- Mutable through standard TEA Model updates
type alias GlobalState = {}
`;

    writeFile('Generated/GlobalConfig.elm', globalConfigContent);
    writeFile('Generated/GlobalState.elm', globalStateContent);
}
```

## Capability Port Generation

### 1. Conditional Generation Strategy

**Generate interfaces only for capabilities the app actually uses:**
```javascript
function detectRequiredCapabilities(rustModels) {
    return {
        hasDatabase: rustModels.some(m => m.dir === 'src/models/db/'),
        hasSession: checkForSessionUsage(), // Look for session-related code
        hasSSE: checkForSSEUsage(),        // Look for SSE event definitions
        hasServices: checkForServiceUsage(), // Look for external API calls
        hasEvents: rustModels.some(m => m.dir === 'src/models/events/'),
        hasKVStore: checkForKVUsage()      // Look for shared state needs
    };
}

function generateCapabilityInterfaces(capabilities, rustModels) {
    if (capabilities.hasDatabase) {
        const dbModels = rustModels.filter(m => m.dir === 'src/models/db/');
        generateDatabaseInterface(dbModels);
    }
    if (capabilities.hasEvents) {
        const eventModels = rustModels.filter(m => m.dir === 'src/models/events/');
        generateEventsInterface(eventModels);
    }
    if (capabilities.hasSession) generateSessionPorts();
    if (capabilities.hasSSE) generateSSEPorts();
    if (capabilities.hasServices) generateServicesPorts();
    if (capabilities.hasKVStore) generateKVStorePorts();
}
```

### 2. Database Interface Generation

**Generate high-level Database.elm module (not just ports):**
```javascript
function generateDatabaseInterface(dbModels) {
    const interfaces = dbModels.map(model => generateModelInterface(model));
    
    const content = `module Generated.Database exposing (..)

import Generated.Database.Ports as Ports
import Json.Encode as Encode

${interfaces.join('\n\n')}
`;

    writeFile('Generated/Database.elm', content);
}

function generateModelInterface(model) {
    const modelName = model.name; // e.g., "MicroblogItem"
    const filterFields = model.fields.map(f => `${capitalize(f.name)} String`).join('\n    | ');
    const sortFields = model.fields.map(f => `${capitalize(f.name)} SortOrder`).join('\n    | ');
    
    return `-- ${modelName} interface
type ${modelName}Filter
    = ${filterFields}

type ${modelName}Sort
    = ${sortFields}

type alias ${modelName}Query =
    { filter : List ${modelName}Filter
    , sort : List ${modelName}Sort
    , paginate : Maybe Pagination
    }

queryAll${modelName} : ${modelName}Query
queryAll${modelName} = 
    { filter = []
    , sort = []
    , paginate = Nothing
    }

-- Core operations
find${modelName} : String -> (Result Error (Maybe ${modelName}) -> msg) -> Cmd msg
find${modelName}s : ${modelName}Query -> (Result Error (List ${modelName}) -> msg) -> Cmd msg
create${modelName} : ${modelName}Data -> (Result Error ${modelName} -> msg) -> Cmd msg
update${modelName} : String -> ${modelName}Data -> (Result Error ${modelName} -> msg) -> Cmd msg
kill${modelName} : String -> (Result Error () -> msg) -> Cmd msg

-- Raw SQL escape hatch
query${modelName}s : String -> List QueryParam -> (Result Error (List ${modelName}) -> msg) -> Cmd msg

-- Convenience functions
findAll${modelName}s : (Result Error (List ${modelName}) -> msg) -> Cmd msg
findAll${modelName}s callback = find${modelName}s queryAll${modelName} callback`;
}
```

**Supporting types generation:**
```javascript
function generateDatabaseTypes() {
    return `-- Common database types
type SortOrder = Asc | Desc

type alias Pagination = { offset : Int, limit : Int }

type alias QueryParam = String -- JSON-encoded parameter
`;
}
```

### 3. Database Runtime Implementation

**JavaScript middleware for query builder:**
```javascript
// Database middleware - handles query builder translation
function createDatabaseMiddleware(server) {
    const dbService = server.getService('database');
    
    server.onElmHandlerLoaded((handlerName, elmApp) => {
        // Single item lookup
        elmApp.ports.findMicroblogItem?.subscribe(async (itemId) => {
            const result = await dbService.findById('microblog_items', itemId, getCurrentHost());
            elmApp.ports.microblogItemFound.send(result);
        });
        
        // Query builder interface
        elmApp.ports.findMicroblogItems?.subscribe(async (query) => {
            const sql = buildQuery('microblog_items', query, getCurrentHost());
            const result = await dbService.query(sql.text, sql.params);
            elmApp.ports.microblogItemsFound.send(result.rows);
        });
        
        // CRUD operations
        elmApp.ports.createMicroblogItem?.subscribe(async (itemData) => {
            const result = await dbService.create('microblog_items', {
                ...itemData,
                host: getCurrentHost() // Host isolation invisible to Elm
            });
            elmApp.ports.microblogItemCreated.send(result);
        });
        
        // Raw SQL escape hatch
        elmApp.ports.queryMicroblogItems?.subscribe(async ({ sql, params }) => {
            const result = await dbService.query(sql, params);
            elmApp.ports.microblogItemsQueried.send(result.rows);
        });
    });
}

// Query builder SQL translation
function buildQuery(table, query, host) {
    let sql = `SELECT * FROM ${table} WHERE host = $1`;
    let params = [host];
    let paramIndex = 2;
    
    // Add filters
    query.filter.forEach(filter => {
        switch (filter.type) {
            case 'AuthorId':
                sql += ` AND author_id = $${paramIndex}`;
                params.push(filter.value);
                paramIndex++;
                break;
            case 'Status':
                sql += ` AND status = $${paramIndex}`;
                params.push(filter.value);
                paramIndex++;
                break;
            // ... other filter types
        }
    });
    
    // Add sorting
    if (query.sort.length > 0) {
        sql += ' ORDER BY ';
        sql += query.sort.map(sort => {
            const direction = sort.order === 'Asc' ? 'ASC' : 'DESC';
            return `${camelToSnake(sort.field)} ${direction}`;
        }).join(', ');
    }
    
    // Add pagination
    if (query.paginate) {
        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(query.paginate.limit, query.paginate.offset);
    }
    
    return { text: sql, params };
}
```

### 4. Events Interface Generation

**Generate strongly typed event functions from Rust event models:**
```javascript
function generateEventsInterface(eventModels) {
    const eventFunctions = eventModels.flatMap(model => [
        `-- ${model.name} event functions
push${model.name} : ${model.name} -> (Result Error () -> msg) -> Cmd msg
schedule${model.name} : Int -> ${model.name} -> (Result Error () -> msg) -> Cmd msg
cron${model.name} : String -> ${model.name} -> (Result Error () -> msg) -> Cmd msg`
    ]).join('\n\n');

    return `module Generated.Events exposing (..)

import Generated.Events.Ports as Ports

${eventFunctions}

-- Implementation functions wire to ports with proper typing
push${model.name} eventData toMsg =
    Ports.pushEvent 
        { eventType = "${model.name}"
        , payload = encodeEventData eventData
        }
        toMsg

schedule${model.name} delayMinutes eventData toMsg =
    Ports.scheduleEvent
        { eventType = "${model.name}"
        , delayMinutes = delayMinutes
        , payload = encodeEventData eventData
        }
        toMsg

cron${model.name} cronSchedule eventData toMsg =
    Ports.cronEvent
        { eventType = "${model.name}"
        , cron = cronSchedule
        , payload = encodeEventData eventData
        }
        toMsg
`;
}
```

**Event model detection from `src/models/events/`:**
```javascript
function parseEventModels(eventFiles) {
    return eventFiles.map(file => {
        const content = fs.readFileSync(file, 'utf-8');
        // Parse pub struct EventName { fields } patterns
        const structPattern = /pub struct\s+(\w+)\s*{([^}]*)}/g;
        // Extract event name and field definitions
        // Generate corresponding Elm types
    });
}
```

### 5. Session Port Generation

**Simple key-value interface with automatic session scoping:**
```javascript
function generateSessionPorts() {
    return `port module Generated.Session.Ports exposing (..)

-- Automatically scoped to current session ID
port set : String -> Json.Encode.Value -> Cmd msg
port get : String -> Cmd msg
port received : (Maybe Json.Encode.Value -> msg) -> Sub msg
port remove : String -> Cmd msg
`;
}
```

### 4. Capability Import Detection

**Smart imports based on handler content:**
```javascript
function analyzeHandlerCapabilities(handlerContent) {
    return {
        needsDatabase: /DB\.|Database\./.test(handlerContent),
        needsSession: /Session\./.test(handlerContent),
        needsSSE: /SSE\./.test(handlerContent),
        needsServices: /Services\./.test(handlerContent),
        needsEvents: /Events\./.test(handlerContent),
        needsKVStore: /KV\.|KVStore\./.test(handlerContent)
    };
}
```

## Runtime Infrastructure Changes

### 1. elm-service.js TEA Lifecycle Management

**Current Problem:** elm-service.js expects sync handler functions
**Solution:** Manage full TEA program lifecycle

```javascript
// New TEA handler loading
function loadTEAHandler(handlerName, handlerModule) {
    const elmApp = handlerModule.init({
        flags: { handlerName, globalConfig: getGlobalConfig(), globalState: getGlobalState() }
    });
    
    // Wire completion detection
    elmApp.ports.buildAmpReturnResponse?.subscribe((response) => {
        completeRouteHandler(handlerName, response);
    });
    
    elmApp.ports.buildAmpReturnError?.subscribe((error) => {
        completeRouteHandler(handlerName, null, error);
    });
    
    // Detect Cmd.none completion for events/webhooks
    elmApp.ports.cmdNoneSignal?.subscribe(() => {
        completeEventHandler(handlerName);
    });
    
    return elmApp;
}
```

### 2. Capability Middleware Wiring

**Each capability gets its own middleware for port subscriptions:**
```javascript
// Database middleware
function createDatabaseMiddleware(server) {
    const dbService = server.getService('database');
    
    server.onElmHandlerLoaded((handlerName, elmApp) => {
        // Wire database ports if they exist
        elmApp.ports.insertMicroblogItem?.subscribe(async (itemData) => {
            const result = await dbService.insertItem('microblog_items', itemData);
            elmApp.ports.microblogItemInsertResult.send(result);
        });
        
        // ... other database operations
    });
}

// Session middleware  
function createSessionMiddleware(server) {
    const kvService = server.getService('kv');
    
    server.onElmHandlerLoaded((handlerName, elmApp) => {
        elmApp.ports.sessionSet?.subscribe(async ({ key, value }) => {
            const sessionKey = `session:${getCurrentSessionId()}:${key}`;
            await kvService.set(sessionKey, value);
        });
        
        // ... other session operations
    });
}
```

### 3. Handler Completion Detection

**Different completion signals for different handler types:**
```javascript
function setupCompletionDetection(elmApp, handlerType) {
    switch (handlerType) {
        case 'route':
            // Explicit completion via BuildAmp ports
            return new Promise((resolve) => {
                elmApp.ports.buildAmpReturnResponse?.subscribe(resolve);
                elmApp.ports.buildAmpReturnError?.subscribe((error) => resolve({ error }));
            });
            
        case 'event':
        case 'webhook':
            // Cmd.none detection
            return new Promise((resolve) => {
                let updateCount = 0;
                elmApp.ports.updateComplete?.subscribe(() => {
                    updateCount++;
                    // If no new Cmd after update, handler is done
                    setTimeout(() => {
                        if (updateCount === 1) resolve();
                    }, 0);
                });
            });
    }
}
```

### 4. Session Isolation Implementation

**Runtime session scoping:**
```javascript
function createSessionScopedOperations(sessionId) {
    return {
        set: (key, value) => kvStore.set(`session:${sessionId}:${key}`, value),
        get: (key) => kvStore.get(`session:${sessionId}:${key}`),
        remove: (key) => kvStore.delete(`session:${sessionId}:${key}`)
    };
}

// Middleware automatically provides session context
app.use((req, res, next) => {
    req.sessionOps = createSessionScopedOperations(req.sessionID);
    next();
});
```

## Migration Strategy

### 1. Coexistence During Transition

**Support both sync and TEA handlers:**
```javascript
function determineHandlerType(handlerModule) {
    if (handlerModule.init && handlerModule.update) {
        return 'tea';
    } else if (typeof handlerModule.handle === 'function') {
        return 'sync';
    }
    throw new Error('Unknown handler type');
}

async function callHandler(handlerName, requestData, context) {
    const handler = handlers.get(handlerName);
    const type = determineHandlerType(handler);
    
    if (type === 'sync') {
        // Legacy sync handler
        return handler.handle(requestData, context);
    } else {
        // New TEA handler
        return runTEAHandler(handler, requestData, context);
    }
}
```

### 2. Incremental Migration Path

**Phase 1: Infrastructure**
- ✅ Generate empty GlobalConfig/GlobalState
- ✅ Add BuildAmp ports 
- ✅ Update elm-service.js for TEA lifecycle
- ✅ Create capability detection logic

**Phase 2: Simple Handlers**
- ✅ Generate TEA scaffolds for new handlers
- ✅ Migrate simple CRUD handlers to TEA
- ✅ Test coexistence with existing handlers

**Phase 3: Complex Handlers**
- ✅ Add capability-specific port modules
- ✅ Migrate complex handlers with async operations
- ✅ Enable SSE, Services, Events capabilities

**Phase 4: Cleanup**
- ✅ Remove sync handler support
- ✅ Clean up unused capability ports
- ✅ Optimize generated code

### 3. Breaking Changes Management

**Major Changes:**
- Handler signatures: `handle(req) -> res` becomes `init/update` 
- Global state access: parameter injection becomes Model field
- Async operations: impossible becomes natural

**Migration Tools:**
```bash
# Auto-migration script for simple handlers
buildamp migrate-handler SubmitItemHandler

# Capability analysis
buildamp analyze-capabilities

# Test mixed handler modes
buildamp test --mixed-handlers
```

## Power User Escape Hatch

### Custom Port Registration API

**For the 1% who need custom capabilities:**
```javascript
// In application startup
const elmService = server.getService('elm');

elmService.registerCustomPorts({
    sendSlackMessage: async (data) => {
        return await slackAPI.send(data.message);
    },
    
    processWithOpenAI: async (data) => {
        return await openAI.complete(data.prompt);
    }
});
```

**Design Constraints:**
- Not documented prominently 
- Requires JavaScript knowledge
- No type safety guarantees
- Used only for truly unusual needs

## Implementation Checklist

### Generation System Updates
- [ ] Extend elm_handlers.js for multi-directory detection
- [ ] Add TEA scaffold template generation
- [ ] Create GlobalConfig/GlobalState generation
- [ ] Add capability detection logic
- [ ] Generate port modules conditionally

### Runtime Infrastructure
- [ ] Update elm-service.js for TEA lifecycle
- [ ] Add capability middleware system
- [ ] Implement session isolation
- [ ] Add completion detection by handler type
- [ ] Wire port subscriptions

### Migration Support
- [ ] Support sync/TEA handler coexistence
- [ ] Create migration tools
- [ ] Add capability analysis
- [ ] Test mixed handler environments

### Power User Features
- [ ] Custom port registration API
- [ ] Advanced capability extension
- [ ] Performance monitoring hooks

## Success Metrics

### Developer Experience
- Simple handlers require < 10 lines of Elm code
- Migration from sync to TEA takes < 30 minutes
- Capability imports are obvious and minimal
- Error messages are clear and actionable

### Performance
- Handler startup time < 10ms
- Memory usage scales linearly with active handlers
- Port communication overhead < 1ms
- Global state access has zero allocation cost

### Architectural Integrity
- No business logic in JavaScript runtime
- All async operations use pure TEA patterns
- Capability modules are independently testable
- Framework code feels invisible to developers

## Updated Handler Usage Examples

### Simple Database Handler
```elm
-- Handler using the new query builder interface
update config msg model =
    case msg of
        LoadItems ->
            ( { model | stage = LoadingItems }
            , DB.findAllMicroblogItems ItemsLoaded
            )
            
        FilterByAuthor authorId ->
            ( { model | stage = FilteringItems }
            , DB.findMicroblogItems 
                { DB.queryAllMicroblogItem | 
                    filter = [ DB.AuthorId authorId ]
                    , sort = [ DB.CreatedAt Desc ]
                } 
                ItemsLoaded
            )
            
        CreateItem itemData ->
            ( { model | stage = CreatingItem }
            , DB.createMicroblogItem itemData ItemCreated
            )
            
        ItemsLoaded (Ok items) ->
            ( { model | stage = Complete, items = items }
            , BuildAmp.returnResponse { items = items }
            )
```

### Complex Query Handler  
```elm
-- Using advanced filtering and pagination
update config msg model =
    case msg of
        LoadPublishedItems page ->
            let
                query = { DB.queryAllMicroblogItem |
                    filter = [ DB.Status "published", DB.AuthorId config.currentUserId ]
                    , sort = [ DB.CreatedAt Desc, DB.Title Asc ]
                    , paginate = Just { offset = page * 20, limit = 20 }
                }
            in
            ( { model | stage = LoadingItems }
            , DB.findMicroblogItems query ItemsLoaded
            )
```

### Event-Driven Handler with Typed Events
```elm
-- Using strongly typed event interfaces
update config msg model =
    case msg of
        UserRegistered user ->
            ( { model | stage = SchedulingWelcomeEmail }
            , Events.scheduleSendWelcomeEmail 10 -- delayMinutes
                { email = user.email
                , name = user.name  
                , user_id = user.id
                }
                WelcomeEmailScheduled
            )
            
        FileUploaded fileData ->
            ( { model | stage = ProcessingFile }
            , Events.pushProcessVideo  -- immediate background processing
                { file_id = fileData.id
                , quality = "high"
                , target_formats = ["mp4", "webm"]
                }
                VideoProcessingStarted
            )
            
        SetupRecurringTasks ->
            ( { model | stage = SchedulingCronJobs }
            , Cmd.batch
                [ Events.cronGenerateDailyReport "0 6 * * *"  -- 6 AM daily
                    { report_type = "usage"
                    , include_analytics = True
                    }
                    DailyReportScheduled
                , Events.cronCleanupTempFiles "0 2 * * SUN"  -- Sunday 2 AM  
                    { older_than_days = 7
                    , max_files = Just 1000
                    }
                    CleanupScheduled
                ]
            )

### Event Store Pattern Handler  
```elm
-- Easy writes with one complex bulk read
update config msg model =
    case msg of
        StoreEvent eventData ->
            ( { model | stage = StoringEvent }
            , DB.createEvent eventData EventStored
            )
            
        RebuildAppState ->
            -- The "crazy shaped hole" - complex SQL for rebuilding state
            ( { model | stage = RebuildingState }
            , DB.queryEvents 
                "SELECT event_type, payload, created_at FROM events WHERE host = current_host() ORDER BY created_at" 
                [] 
                EventsLoaded
            )
            
        EventsLoaded (Ok events) ->
            let
                appState = rebuildStateFromEvents events
                updatedGlobalState = { model.globalState | appState = appState }
            in
            ( { model | globalState = updatedGlobalState }
            , BuildAmp.returnResponse { rebuilt = True }
            )
```

## Next Steps

1. **Validate approach** - Prototype single TEA handler conversion with query builder
2. **Build generation** - Implement database interface generation from Rust models
3. **Runtime update** - Modify elm-service.js for TEA lifecycle and query translation
4. **Test integration** - Verify query builder SQL translation works correctly
5. **Migration tools** - Create sync→TEA conversion helpers
6. **Documentation** - Write query builder usage guide and filter/sort patterns
7. **Performance** - Optimize query building and handler startup

This implementation plan provides the detailed roadmap for building the TEA Handler Architecture with the superior query builder interface, maintaining the "small apps with weirdly shaped holes" philosophy while providing a bounded, composable database interface that scales from simple to complex without becoming an ORM monster.