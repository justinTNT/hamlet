# WebSocket Support

**Priority**: Low (advanced real-time features)
**Use Case**: Bidirectional real-time communication, gaming platform, collaborative editing

## Core Concept

Server-mediated WebSocket connections with Elm business logic controlling all routing and validation. Enables gaming and real-time collaborative applications.

## WebSocket Message Definitions

WebSocket message types are defined in regular Rust files. BuildAmp detects from filename and generates bidirectional messaging.

```rust
// models/ws/game_ws.rs
pub struct GameMove {
    pub game_id: String,
    pub player_id: String,
    pub move_data: serde_json::Value,
    pub timestamp: i64,
}

pub struct GameState {
    pub game_id: String,
    pub current_board: serde_json::Value,
    pub current_player: String,
    pub move_count: u32,
}

// models/ws/collaboration_ws.rs
pub struct CursorUpdate {
    pub item_id: String,
    pub user_id: String,
    pub position: Position,
    pub color: String,
}

pub struct LiveEdit {
    pub document_id: String,
    pub user_id: String,
    pub operation: EditOperation,
    pub version: u32,
}

pub struct TypingIndicator {
    pub channel: String,  // "chat:room123", "document:456" 
    pub user_id: String,
    pub is_typing: bool,
}

// models/ws/ui_ws.rs
pub struct SelectionUpdate {
    pub item_id: String,
    pub user_id: String,
    pub selected_text: Option<String>,
    pub selection_range: Option<(u32, u32)>,
}
```

## Generated Elm Integration

```elm
-- Auto-generated WebSocket types and functions
module BuildAmp.WebSocket exposing (..)

type WebSocketMsg
    = GameMoveReceived GameMove
    | CursorUpdateReceived CursorUpdate  
    | LiveEditReceived LiveEdit
    | TypingIndicatorReceived TypingIndicator
    | WebSocketError String
    | WebSocketConnected String
    | WebSocketDisconnected

-- Generated send functions
sendGameMove : String -> GameMove -> Cmd msg
sendCursorUpdate : String -> CursorUpdate -> Cmd msg
sendLiveEdit : String -> LiveEdit -> Cmd msg

-- Generated subscriptions
subscribeToGameMoves : String -> (GameMove -> msg) -> Sub msg
subscribeToCursorUpdates : String -> (CursorUpdate -> msg) -> Sub msg
subscribeToLiveEdits : String -> (LiveEdit -> msg) -> Sub msg

-- Connection management
connectToRoom : String -> Cmd msg
disconnectFromRoom : String -> Cmd msg
```

## Server WebSocket Handler

```javascript
// server.js - WebSocket setup
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Connection registry: room -> Set<WebSocket>
const rooms = new Map();
const userConnections = new Map(); // userId -> { socket, rooms: Set<String> }

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            await handleWebSocketMessage(ws, message);
        } catch (error) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: error.message 
            }));
        }
    });
    
    ws.on('close', () => {
        handleWebSocketDisconnect(ws);
    });
});

// Heartbeat to detect broken connections
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);
```

## Message Processing

```javascript
async function handleWebSocketMessage(ws, message) {
    const { type, room, payload, userId } = message;
    
    switch (type) {
        case 'join_room':
            await joinRoom(ws, room, userId);
            break;
            
        case 'leave_room':
            await leaveRoom(ws, room, userId);
            break;
            
        case 'send_message':
            await routeMessage(ws, room, payload, userId);
            break;
            
        default:
            throw new Error(`Unknown message type: ${type}`);
    }
}

async function routeMessage(ws, room, payload, userId) {
    // 1. Validate message via WASM/Elm
    const context = {
        host: getHostFromRoom(room),
        user_id: userId,
        room: room,
        timestamp: Date.now()
    };
    
    const validationResult = await validateWebSocketMessage(payload.message_type, payload, context);
    if (!validationResult.valid) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            error: validationResult.error 
        }));
        return;
    }
    
    // 2. Process via Elm business logic
    const elmResult = await Elm.WebSocketLogic.process({
        message_type: payload.message_type,
        payload: payload,
        context: context,
        sender: userId
    });
    
    // 3. Execute effects
    for (const effect of elmResult.effects) {
        if (effect.Broadcast) {
            await broadcastToRoom(effect.Broadcast.room, effect.Broadcast.message, effect.Broadcast.exclude);
        } else if (effect.SendToUser) {
            await sendToUser(effect.SendToUser.user_id, effect.SendToUser.message);
        } else if (effect.UpdateGameState) {
            await updateGameState(effect.UpdateGameState);
        } else if (effect.ScheduleEvent) {
            await scheduleBackgroundEvent(effect.ScheduleEvent);
        }
    }
}
```

## Elm WebSocket Business Logic

```elm
-- WebSocketLogic.elm - separate from main business logic
module WebSocketLogic exposing (processMessage)

processMessage : WebSocketMessage -> Context -> (List Effect, Response)
processMessage msg ctx =
    case msg.message_type of
        "GameMove" ->
            processGameMove msg.payload ctx
            
        "CursorUpdate" ->
            processCursorUpdate msg.payload ctx
            
        "LiveEdit" ->
            processLiveEdit msg.payload ctx
            
        "TypingIndicator" ->
            processTypingIndicator msg.payload ctx

processGameMove : GameMovePayload -> Context -> (List Effect, Response)
processGameMove move ctx =
    let
        -- Validate move is legal
        gameState = getGameState move.game_id ctx
        
        validMove = validateGameMove gameState move ctx.user_id
    in
    if validMove.legal then
        [ UpdateGameState 
            { game_id = move.game_id
            , new_state = validMove.new_state
            }
        , Broadcast
            { room = "game:" ++ move.game_id
            , message = { type = "GameMoveUpdate", payload = move }
            , exclude = [ctx.user_id]  -- Don't echo to sender
            }
        , KVSet  -- Store game state
            { key = "game_state:" ++ move.game_id
            , value = validMove.new_state
            , ttl = Just (60 * 60)  -- 1 hour
            }
        -- Check win condition
        ] ++ (if validMove.game_ended then
                [ ScheduleEvent
                    { event_type = "GameCompleted"
                    , payload = { game_id = move.game_id, winner = validMove.winner }
                    , delay = 0
                    }
                ]
              else [])
    else
        [ SendToUser
            { user_id = ctx.user_id
            , message = { type = "InvalidMove", error = validMove.error }
            }
        ]

processCursorUpdate : CursorPayload -> Context -> (List Effect, Response)
processCursorUpdate cursor ctx =
    [ KVSet  -- Store current cursor position
        { key = "cursor:" ++ cursor.item_id ++ ":" ++ ctx.user_id
        , value = { x = cursor.position.x, y = cursor.position.y }
        , ttl = Just 30  -- 30 seconds
        }
    , Broadcast
        { room = "item:" ++ cursor.item_id
        , message = { type = "CursorMoved", payload = cursor }
        , exclude = [ctx.user_id]
        }
    ]

processLiveEdit : LiveEditPayload -> Context -> (List Effect, Response)
processLiveEdit edit ctx =
    let
        -- Operational Transform for conflict resolution
        currentVersion = getCurrentDocVersion edit.document_id
        
        transformedOp = 
            if edit.version == currentVersion then
                edit.operation
            else
                transformOperation edit.operation currentVersion
    in
    [ UpdateDocument
        { document_id = edit.document_id
        , operation = transformedOp
        , new_version = currentVersion + 1
        }
    , Broadcast
        { room = "document:" ++ edit.document_id
        , message = 
            { type = "DocumentUpdate"
            , payload = { operation = transformedOp, version = currentVersion + 1 }
            }
        , exclude = [ctx.user_id]
        }
    , ScheduleEvent  -- Periodic save to database
        { event_type = "SaveDocumentSnapshot"
        , delay_seconds = 30
        , payload = { document_id = edit.document_id }
        }
    ]
```

## Room Management

```javascript
async function joinRoom(ws, room, userId) {
    // 1. Validate user can join room
    const canJoin = await validateRoomAccess(room, userId);
    if (!canJoin) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            error: 'Access denied to room' 
        }));
        return;
    }
    
    // 2. Add to room
    if (!rooms.has(room)) {
        rooms.set(room, new Set());
    }
    rooms.get(room).add(ws);
    
    // 3. Track user connections
    if (!userConnections.has(userId)) {
        userConnections.set(userId, { socket: ws, rooms: new Set() });
    }
    userConnections.get(userId).rooms.add(room);
    
    // 4. Notify room of new user
    broadcastToRoom(room, {
        type: 'user_joined',
        user_id: userId,
        timestamp: Date.now()
    }, [userId]);
    
    // 5. Send current room state to new user
    const roomState = await getRoomState(room);
    ws.send(JSON.stringify({
        type: 'room_state',
        room: room,
        state: roomState
    }));
}

async function broadcastToRoom(room, message, excludeUsers = []) {
    const connections = rooms.get(room);
    if (!connections) return;
    
    const messageStr = JSON.stringify({
        type: 'broadcast',
        room: room,
        message: message,
        timestamp: Date.now()
    });
    
    connections.forEach(ws => {
        // Skip excluded users
        const userId = getUserIdFromConnection(ws);
        if (excludeUsers.includes(userId)) return;
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageStr);
        } else {
            connections.delete(ws);
        }
    });
}
```

## Gaming Platform Features

### Turn-Based Games
```elm
-- Chess game implementation
processChessMove : ChessMovePayload -> Context -> (List Effect, Response)
processChessMove move ctx =
    let
        game = getChessGame move.game_id ctx
        legalMove = validateChessMove game.board move.from move.to ctx.user_id
    in
    if legalMove.valid then
        [ UpdateGameState
            { game_id = move.game_id
            , board = legalMove.new_board
            , turn = switchTurn game.current_turn
            , move_history = move :: game.move_history
            }
        , Broadcast
            { room = "chess:" ++ move.game_id
            , message = { type = "ChessMove", move = move, new_board = legalMove.new_board }
            , exclude = [ctx.user_id]
            }
        -- Check for checkmate, stalemate
        ] ++ (checkGameEnd legalMove.new_board |> gameEndEffects move.game_id)
    else
        [ SendToUser
            { user_id = ctx.user_id  
            , message = { type = "IllegalMove", reason = legalMove.reason }
            }
        ]
```

### Real-Time Games  
```elm
-- Simple multiplayer game with collision detection
processPlayerMove : PlayerMovePayload -> Context -> (List Effect, Response)
processPlayerMove playerMove ctx =
    let
        -- Update player position
        newPosition = calculateNewPosition playerMove.direction playerMove.speed
        
        -- Check collisions with other players
        otherPlayers = getOtherPlayersInGame playerMove.game_id ctx.user_id
        collision = checkCollisions newPosition otherPlayers
    in
    [ KVSet  -- Update player position
        { key = "player_pos:" ++ playerMove.game_id ++ ":" ++ ctx.user_id
        , value = newPosition  
        , ttl = Just 60
        }
    , Broadcast
        { room = "game:" ++ playerMove.game_id
        , message = { type = "PlayerMoved", user_id = ctx.user_id, position = newPosition }
        , exclude = []  -- All players need to see movement
        }
    ] ++ (if collision.detected then
            [ ScheduleEvent
                { event_type = "HandlePlayerCollision"
                , payload = { game_id = playerMove.game_id, players = collision.players }
                , delay = 0
                }
            ]
          else [])
```

## Connection Management

### Presence Tracking
```elm
-- Track who's online in each room
handleUserPresence : PresenceEvent -> Context -> (List Effect, Response)
handleUserPresence presence ctx =
    case presence.event_type of
        "UserJoined" ->
            [ KVSet
                { key = "presence:" ++ presence.room ++ ":" ++ ctx.user_id
                , value = { joined_at = ctx.timestamp, status = "online" }
                , ttl = Just 300  -- 5 minutes
                }
            , Broadcast
                { room = presence.room
                , message = { type = "UserOnline", user_id = ctx.user_id }
                , exclude = [ctx.user_id]
                }
            ]
            
        "UserLeft" ->
            [ KVDelete { key = "presence:" ++ presence.room ++ ":" ++ ctx.user_id }
            , Broadcast
                { room = presence.room  
                , message = { type = "UserOffline", user_id = ctx.user_id }
                , exclude = []
                }
            ]
```

## Performance Considerations

### Message Rate Limiting
```elm
-- Prevent message spam
processWebSocketMessage : WebSocketMessage -> Context -> (List Effect, Response)
processWebSocketMessage msg ctx =
    let
        rateLimitKey = "ws_rate:" ++ ctx.user_id
        currentCount = getKVValue rateLimitKey |> Maybe.withDefault 0
    in
    if currentCount > 100 then  -- 100 messages per minute
        [ SendToUser
            { user_id = ctx.user_id
            , message = { type = "RateLimit", message = "Too many messages" }
            }
        ]
    else
        [ KVSet
            { key = rateLimitKey
            , value = currentCount + 1
            , ttl = Just 60  -- Reset every minute
            }
        ] ++ (processMessageContent msg ctx)
```

### Connection Cleanup
```javascript
// Periodic cleanup of dead connections
setInterval(() => {
    rooms.forEach((connections, room) => {
        connections.forEach(ws => {
            if (ws.readyState !== WebSocket.OPEN) {
                connections.delete(ws);
                handleWebSocketDisconnect(ws);
            }
        });
        
        if (connections.size === 0) {
            rooms.delete(room);
        }
    });
}, 60000); // Every minute
```

## Benefits

- **Type-safe messaging**: All WebSocket messages validated via Rust types
- **Elm business logic**: Game rules and validation in pure functional code
- **Server mediation**: Full control over message routing and security
- **Room isolation**: Multi-tenant gaming with proper separation  
- **Integration**: Works with background events, KV store, file uploads
- **Gaming platform**: Turn-based and real-time games supported

## Use Cases

### Gaming
- Chess, checkers, board games
- Real-time multiplayer games
- Puzzle games with shared state
- Educational games

### Collaboration  
- Shared document editing
- Collaborative drawing/design
- Code pair programming
- Virtual whiteboards

### Real-Time Features
- Live cursors and selections
- Typing indicators
- Presence awareness
- Live comments/chat

## Implementation Notes

- Start with simple room-based messaging
- Add game-specific validation in Elm
- Implement operational transform for collaborative editing
- Consider WebSocket compression for high-frequency updates
- Add reconnection logic with state synchronization
- Monitor memory usage of active connections

## Integration Points

- **Background events**: Game state persistence, match results
- **Key-value store**: Real-time state, presence tracking, game caching
- **File uploads**: Share images, game assets
- **SSE**: Fallback for one-way updates
- **Webhooks**: Integration with external gaming services