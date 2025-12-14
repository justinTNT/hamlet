# Session Store Integration

**STATUS**: Phase 1 requirement for session-based targeting

**PRIORITY**: High (enables SSE targeting and event correlation)

## Core Concept

Generate Elm session types from Rust definitions, seamlessly hook into Express session store. Provides type-safe session context across requests, events, and real-time features.

### Design Principles
- **Application-defined context**: Apps specify session shape in Rust
- **Universal access**: Same session context in HTTP handlers, event processors, SSE/WebSocket
- **Express integration**: Leverage proven session infrastructure  
- **Type safety**: Generated Elm types from Rust definitions

## Session Type Definition

Applications define session context in Rust:

```rust
// models/session.rs
#[derive(BuildAmpSession, Debug, Clone)]
pub struct AppSession {
    pub user_id: String,
    pub current_channel: String,
    pub preferences: UserPrefs,
    pub login_time: i64,
}

// OR minimal session for session-ID-only apps
#[derive(BuildAmpSession, Debug, Clone)]
pub struct AppSession {
    // Empty - session_id from context is sufficient
}

// OR game-specific context
#[derive(BuildAmpSession, Debug, Clone)]
pub struct GameSession {
    pub player_id: String,
    pub current_game: Option<String>,
    pub game_role: GameRole,
}
```

## Generated Express Integration

**Session middleware setup (generated)**:
```javascript
// Generated session configuration
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: getSessionStore(), // Redis, DB, or memory
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Generated session access functions
function getElmSession(sessionId) {
  // Retrieves typed session data for Elm context
  return sessionStore.get(sessionId).appSession;
}

function updateElmSession(sessionId, newSessionData) {
  // Updates session with type-safe data
  sessionStore.get(sessionId).appSession = newSessionData;
}
```

## Generated Elm Interface

**Session operations (generated from Rust types)**:
```elm
-- Generated session context type
type alias Context = 
    { sessionId : String
    , session : AppSession  -- Typed from Rust definition
    , host : String
    , requestId : String
    }

-- Generated session operations
updateSessionContext : AppSession -> Context -> Effect
getSessionContext : Context -> AppSession

-- Usage in business logic
processChannelJoin : ChannelJoinReq -> Context -> (List Effect, Response)
processChannelJoin req ctx =
    [ updateSessionContext { ctx.session | current_channel = req.channel }
    , SSEBroadcast (getChannelMembers req.channel ctx) (UserJoined ctx.session.user_id)
    ]
```

## Event Store Integration

Events include session_id for targeting:

```elm
-- Event creation automatically includes session context
scheduleWelcomeEmail : EmailData -> Context -> Effect
scheduleWelcomeEmail emailData ctx =
    ScheduleEvent 
        { event_type = "SendWelcomeEmail"
        , session_id = ctx.sessionId  -- Automatic session correlation
        , payload = emailData
        , delay_minutes = 10
        }

-- Event processing can access original session (if still active)
processWelcomeEmail : Event -> Context -> (List Effect, Response)  
processWelcomeEmail event ctx =
    if isSessionActive event.session_id then
        [ SendToSession event.session_id (WelcomeEmailSent)
        , TriggerWebhook "SendGrid" event.payload
        ]
    else
        [ -- Session expired, handle gracefully
          LogEvent "welcome_email_session_expired" event
        ]
```

## SSE/WebSocket Targeting

Session IDs enable precise real-time targeting:

```elm
-- Business logic maps concepts to sessions
getGamePlayerSessions : String -> Context -> List SessionId
getItemSubscriberSessions : String -> Context -> List SessionId

-- Framework routes to sessions
type Effect 
    = SSEBroadcast (List SessionId) SSEMessage
    | SendToSession SessionId SSEMessage
    | BroadcastAll SSEMessage

-- Example usage
processCommentAdded comment ctx =
    let subscriberSessions = getItemSubscriberSessions comment.item_id ctx
    in
    [ Insert "comments" comment
    , SSEBroadcast subscriberSessions (CommentAdded comment)
    , updateSessionContext { ctx.session | last_activity = now }
    ]
```

## Application Flexibility

**Minimal apps**: Session ID alone is sufficient context
```rust
#[derive(BuildAmpSession, Debug, Clone)]
pub struct AppSession {} // Empty - just use ctx.sessionId
```

**Rich apps**: Complex session state
```rust
#[derive(BuildAmpSession, Debug, Clone)]
pub struct CollabSession {
    pub user_id: String,
    pub active_documents: Vec<String>,
    pub cursor_positions: HashMap<String, CursorPos>,
    pub collaboration_role: Role,
}
```

**Game apps**: Game-specific context
```rust
#[derive(BuildAmpSession, Debug, Clone)]
pub struct GameSession {
    pub player_name: String,
    pub current_match: Option<String>,
    pub skill_level: i32,
    pub preferred_game_mode: GameMode,
}
```

## Security & Privacy

**Session ID protection**:
- Session IDs never included in client message payloads
- Used for server-side routing only
- Automatic cleanup when sessions expire
- Tenant isolation through host boundaries

**Generated safeguards**:
```elm
-- Framework ensures session IDs stay internal
processGameMove move ctx =
    [ SSEBroadcast [opponentSessionId] (PlayerMoved move)  -- Session ID for routing
    -- Client receives: { "type": "PlayerMoved", "move": {...} }  -- No session leak
    ]
```

## Benefits

- **Type-safe sessions**: Rust definitions → generated Elm types
- **Universal access**: Same session shape in all contexts
- **Express integration**: Leverages proven session infrastructure
- **Application flexibility**: Minimal or rich session context as needed
- **Real-time targeting**: Efficient session-based message routing
- **Security**: Session IDs protected from client exposure

## Implementation Notes

- Hook into existing Express session middleware
- Generate session access functions for Elm context
- Add session_id column to events table for targeting
- Provide session lifecycle hooks for cleanup
- Support Redis, database, or memory session stores
- Handle session expiry gracefully in event processing

## Integration Points

- **Event system**: Events correlated with sessions for targeting
- **SSE**: Session-based message routing
- **WebSocket**: Session-mediated connection management  
- **Authentication**: Session creation during login
- **Real-time features**: Precise targeting without exposing internals