# Server-Sent Events

**Priority**: Medium (core real-time feature)
**Use Case**: Real-time server→client streaming, 80% of real-time needs

## Core Concept

One-way server→client streaming using HTTP EventSource. Perfect complement to event sourcing - events flow from background queue to client streams.

## SSE Event Definitions

SSE events are defined in regular Rust files. BuildAmp detects from filename and generates streaming functions.

```rust
// models/sse/comment_sse.rs
pub struct CommentAdded {
    pub comment_id: String,
    pub item_id: String,
    pub author_name: String,
    pub text: String,
    pub timestamp: i64,
}

pub struct CommentUpdated {
    pub comment_id: String,
    pub item_id: String,
    pub new_text: String,
    pub edited_at: i64,
}

// models/sse/notification_sse.rs  
pub struct EmailSent {
    pub user_id: String,
    pub email_type: String,
    pub sent_to: String,
    pub correlation_id: String,
}

pub struct TaskComplete {
    pub user_id: String,
    pub task_type: String,
    pub result: String,
    pub duration_ms: u64,
}

// models/sse/system_sse.rs
pub struct SystemAlert {
    pub message: String,
    pub severity: String,
    pub expires_at: i64,
}
```

## Generated Elm Subscriptions

```elm
-- Auto-generated from SSE definitions
subscribeToComments : String -> (CommentStreamEvent -> msg) -> Sub msg
subscribeToComments itemId toMsg =
    commentStreamSubscription 
        { channel = "item:" ++ itemId 
        , onEvent = toMsg
        , onError = HandleSSEError
        , onReconnect = HandleSSEReconnect
        }

subscribeToNotifications : String -> (NotificationStreamEvent -> msg) -> Sub msg  
subscribeToNotifications userId toMsg =
    notificationStreamSubscription
        { channel = "user:" ++ userId
        , onEvent = toMsg  
        }

-- Generated event types
type CommentStreamEvent
    = CommentAdded Comment
    | CommentEdited Comment
    | CommentDeleted String

type NotificationStreamEvent  
    = EmailSent EmailNotification
    | TaskComplete TaskNotification
```

## Server Implementation

**SSE Connection Manager**:
```javascript
// server.js - SSE connection management
const sseConnections = new Map(); // channel -> Set<Response>

app.get('/sse/:stream_type/:channel', (req, res) => {
    const { stream_type, channel } = req.params;
    const fullChannel = `${stream_type}:${channel}`;
    
    // Validate auth if required
    if (streamRequiresAuth(stream_type)) {
        const authValid = validateAuth(req);
        if (!authValid) return res.status(401).end();
    }
    
    // Setup SSE connection
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    // Register connection
    if (!sseConnections.has(fullChannel)) {
        sseConnections.set(fullChannel, new Set());
    }
    sseConnections.get(fullChannel).add(res);
    
    // Cleanup on disconnect
    req.on('close', () => {
        sseConnections.get(fullChannel).delete(res);
        if (sseConnections.get(fullChannel).size === 0) {
            sseConnections.delete(fullChannel);
        }
    });
    
    // Send initial connection confirmation
    res.write('data: {"type":"connected","channel":"' + fullChannel + '"}\n\n');
});

// Broadcast function
function broadcastToChannel(channel, eventType, data) {
    const connections = sseConnections.get(channel);
    if (!connections) return;
    
    const sseData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    
    for (const connection of connections) {
        try {
            connection.write(sseData);
        } catch (error) {
            // Remove dead connections
            connections.delete(connection);
        }
    }
}
```

## Event Queue Integration

**Background event processor broadcasts via SSE**:
```javascript
// In background event processor
case "CommentAdded":
    // Process the comment addition
    await executeCommentAddition(event);
    
    // Broadcast to SSE streams
    broadcastToChannel(
        `CommentStream:item:${event.payload.item_id}`,
        'CommentAdded',
        event.payload.comment
    );
    
    // Also broadcast to user notification streams
    const itemOwner = await getItemOwner(event.payload.item_id);
    broadcastToChannel(
        `NotificationStream:user:${itemOwner.id}`,
        'NewCommentNotification', 
        { 
            message: `New comment on "${itemOwner.title}"`,
            item_id: event.payload.item_id
        }
    );
```

**Elm business logic triggers SSE**:
```elm
-- In Elm EventLogic.elm
processEvent : Event -> (List Effect, Response)
processEvent event =
    case event.event_type of
        "CommentAdded" ->
            [ Insert "item_comments" event.payload
            , SSEBroadcast
                { channel = "CommentStream:item:" ++ event.payload.item_id
                , event_type = "CommentAdded"  
                , data = event.payload.comment
                }
            , SSEBroadcast
                { channel = "NotificationStream:user:" ++ event.context.item_owner_id
                , event_type = "NewCommentNotification"
                , data = { message = "New comment on your post" }
                }
            ]
```

## Client Usage

```elm
-- In Elm app
type Msg
    = CommentReceived CommentStreamEvent
    | NotificationReceived NotificationStreamEvent
    | SSEError String

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ subscribeToComments model.currentItemId CommentReceived
        , subscribeToNotifications model.currentUserId NotificationReceived
        ]

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        CommentReceived (CommentAdded comment) ->
            ( { model | comments = comment :: model.comments }
            , Cmd.none
            )
            
        NotificationReceived (EmailSent notification) ->
            ( { model | notifications = notification :: model.notifications }
            , Cmd.none
            )
```

## Key Benefits

- **Simpler than WebSocket**: No handshake, automatic reconnection
- **HTTP-based**: Works through firewalls, proxies
- **Event sourcing integration**: Natural fit with background event queue
- **Type-safe events**: Generated Elm types for all events
- **Multiple channels**: Subscribe to different event streams
- **Authorization**: Per-channel auth support

## Use Cases

### Real-time Updates
- New comments on posts
- Live feed updates  
- Real-time notifications
- Progress updates on long tasks

### System Notifications
- Background job completion
- Error alerts
- System status updates
- Admin broadcasts

### Live Data
- Real-time metrics
- Live chat messages (one-way)
- Stock prices, game scores
- Activity feeds

## Implementation Notes

- Start with simple in-memory connection tracking
- Consider Redis pub/sub for multi-server deployment
- Automatic reconnection handled by browser
- Heartbeat/keepalive for connection health
- Connection limits per channel to prevent abuse
- Dead connection cleanup essential

## Integration Points

- **Background events**: Primary source of SSE events
- **WebSocket**: SSE for broadcast, WebSocket for bidirectional  
- **Key-value store**: Track active subscribers
- **File processing**: Progress updates via SSE
- **Webhooks**: Status updates on external calls

## Limitations vs WebSocket

- **One-way only**: Server→client, no client→server
- **Text only**: No binary data support
- **HTTP overhead**: Slightly more bandwidth than WebSocket
- **Browser connection limits**: ~6 concurrent SSE connections per domain

**Perfect for**: Notifications, live feeds, progress updates
**Use WebSocket for**: Chat, gaming, collaborative editing