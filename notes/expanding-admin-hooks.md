# Expanding Admin Hooks

Current admin hooks only support field-change watching:

```elm
{ table = "item_comment", field = "removed", event = "CommentModerated" }
```

## Obvious Expansions

### 1. Trigger Types

```elm
type Trigger
    = OnInsert
    | OnUpdate (Maybe String)  -- Nothing = any field, Just field = specific field
    | OnDelete
```

### 2. Conditions

```elm
{ table = "item_comment"
, trigger = OnUpdate (Just "status")
, condition = Just "status = 'published'"  -- SQL WHERE clause
, event = "CommentPublished"
}
```

### 3. Multi-Field Events

```elm
{ table = "item_comment"
, trigger = OnUpdate Nothing  -- any field
, fields = [ "title", "body" ]  -- include these in payload
, event = "CommentEdited"
}
```

### 4. Payload Shaping

Current: fixed `{ recordId, table, field, oldValue, newValue }`

Expanded: let model define what's included:

```elm
type alias CommentEditedPayload =
    { id : String
    , title : String
    , body : String
    , editedAt : Int
    }
```

Generator builds SELECT to populate payload fields from the affected row.

## Implementation Notes

- OnInsert/OnDelete could use PostgreSQL triggers or application-level hooks
- Conditions require careful SQL injection prevention (parameterize or whitelist)
- Multi-field payloads need schema introspection to validate field names exist
