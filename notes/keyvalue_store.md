# Type-Safe Key-Value Store

**Priority**: High (foundational)
**Use Case**: Client coordination, session management, caching patterns

## Core Concept

In-memory key-value store with type-safe operations, tenant isolation, and Elm integration. Avoids "JSON Redis" anti-pattern.

## Architecture

```javascript
// server.js - shared infrastructure
const tenantStores = new Map(); // host -> Map<string, { value, expires_at, type }>

function getOrCreateStore(host) {
    if (!tenantStores.has(host)) {
        tenantStores.set(host, new Map());
    }
    return tenantStores.get(host);
}
```

## Type Definitions

Key-value types are defined in regular Rust files. BuildAmp detects from filename and generates storage functions.

```rust
// models/storage/user_storage.rs
pub struct UserPreferences {
    pub theme: String,
    pub notifications: bool,
    pub language: String,
}

pub struct SessionCache {
    pub user_id: String,
    pub permissions: Vec<String>,
    pub last_activity: i64,
}

// models/storage/ui_storage.rs
pub struct CursorPosition {
    pub x: i32,
    pub y: i32,
    pub item_id: String,
    pub user_id: String,
}

pub struct ViewportState {
    pub scroll_y: f64,
    pub selected_item: Option<String>,
    pub sidebar_collapsed: bool,
}
```

## Generated Operations

**Rust generates Elm helpers**:
```elm
-- Auto-generated from BuildAmpKV types
setUserPreferences : UserPreferences -> Cmd Msg
getUserPreferences : String -> Task Never (Maybe UserPreferences)
deleteUserPreferences : String -> Cmd Msg

setCursorPosition : String -> CursorPosition -> Cmd Msg
getCursorPosition : String -> Task Never (Maybe CursorPosition)
listCursorPositions : String -> Task Never (List (String, CursorPosition))  -- prefix search
```

**Server handlers**:
```javascript
// Auto-generated endpoints
app.post('/kv/set/:type/:key', async (req, res) => {
    const store = getOrCreateStore(req.headers.host);
    const fullKey = `${req.params.type}:${req.params.key}`;
    
    // Type validation via WASM
    const validated = validateKVType(req.params.type, req.body);
    if (validated.error) return res.status(400).json(validated);
    
    store.set(fullKey, {
        value: validated.data,
        expires_at: req.body.ttl ? Date.now() + req.body.ttl : null,
        type: req.params.type
    });
    
    res.json({ success: true });
});

app.get('/kv/get/:type/:key', (req, res) => {
    const store = getOrCreateStore(req.headers.host);
    const fullKey = `${req.params.type}:${req.params.key}`;
    const item = store.get(fullKey);
    
    if (!item || (item.expires_at && item.expires_at < Date.now())) {
        return res.json({ value: null });
    }
    
    res.json({ value: item.value });
});
```

## Usage Patterns

### 1. Client Coordination
```elm
-- Live cursor sharing
updateCursor : Position -> Cmd Msg
updateCursor pos =
    setCursorPosition 
        ("user:" ++ currentUserId) 
        { x = pos.x, y = pos.y, item_id = currentItemId, user_id = currentUserId }

-- Get all cursors for current item
getCursorsForItem : String -> Task Never (List CursorPosition)
getCursorsForItem itemId =
    listCursorPositions ("user:")
    |> Task.map (List.map Tuple.second)
    |> Task.map (List.filter (\cursor -> cursor.item_id == itemId))
```

### 2. Session Management
```elm
-- Cache expensive user data
cacheUserSession : User -> Permissions -> Cmd Msg
cacheUserSession user perms =
    setSessionCache 
        ("session:" ++ user.id)
        { user_id = user.id
        , permissions = perms
        , last_activity = Time.posixToMillis (Time.now())
        }
        
-- Retrieve cached session
getCachedSession : String -> Task Never (Maybe SessionCache)
getCachedSession userId =
    getSessionCache ("session:" ++ userId)
```

### 3. Application State
```elm
-- Store app configuration
setAppConfig : AppConfig -> Cmd Msg
setAppConfig config =
    setUserPreferences 
        "app_config"
        { theme = config.theme
        , notifications = config.enableNotifications  
        , language = config.language
        }
```

## Key Benefits

- **Type safety**: No JSON.parse/stringify errors
- **Tenant isolation**: Automatic host-based separation
- **No external deps**: Just in-memory, no Redis/Memcached
- **Elm integration**: Generated operations feel native
- **TTL support**: Automatic expiration
- **Prefix search**: Find related keys easily

## Use Cases

### Client Coordination
- Live cursor positions
- Typing indicators  
- Presence information
- Shared selection state

### Session Management  
- User preferences
- Cached permissions
- Authentication state
- Shopping cart contents

### Application Cache
- Expensive query results
- User context hydration
- Computed values
- External API responses

### Background Job State
- Job progress tracking
- Inter-job communication
- Workflow coordination
- Rate limiting counters

## Implementation Notes

- Keys automatically prefixed by type for safety
- Tenant stores isolated by host header
- Memory cleanup on server restart (ephemeral by design)
- User responsible for memory management
- No persistence - rebuild state on restart
- Concurrent access safe (single-threaded Node.js)

## Integration Points

- **Background events**: Store job state and progress
- **WebSocket**: Coordinate real-time features
- **File processing**: Track upload/processing status  
- **SSE**: Cache subscriber lists
- **Webhooks**: Rate limiting and retry state

## Performance Considerations

- In-memory only - fast access
- No network overhead
- Single-threaded access
- Memory growth monitoring needed
- Consider cleanup strategies for long-running processes