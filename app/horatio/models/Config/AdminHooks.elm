module Config.AdminHooks exposing (..)

{-| Admin Hooks Configuration

Defines hooks that trigger events when admin performs operations.
Events are published to the buildamp_events queue for background processing.

## Triggers

- `OnInsert` - fires after a new record is created
- `OnUpdate` - fires after a record is updated
- `OnDelete` - fires after a record is deleted

## Payload

All hooks receive `{ before : Maybe row, after : Maybe row }`:

- OnInsert: `{ before = Nothing, after = Just row }`
- OnUpdate: `{ before = Just oldRow, after = Just newRow }`
- OnDelete: `{ before = Just row, after = Nothing }`

## Conditions

Conditions can reference `Before` or `After` row state:

    changed "status"  -- field value changed
    changedTo "status" "published"  -- changed to specific value
    Eq (Field After "removed") (Const "true")  -- explicit condition

Conditions are validated against trigger type (e.g., OnInsert can't reference Before).

-}


adminHooks : List AdminHook
adminHooks =
    [ { table = "item_comment"
      , trigger = OnUpdate
      , condition = Just (changed "removed")
      , event = "CommentModerated"
      }
    ]



-- TYPES


type alias AdminHook =
    { table : String
    , trigger : Trigger
    , condition : Maybe Condition
    , event : String
    }


type Trigger
    = OnInsert
    | OnUpdate
    | OnDelete


type Condition
    = Eq Value Value
    | Neq Value Value
    | IsNull RowRef String
    | IsNotNull RowRef String
    | And Condition Condition
    | Or Condition Condition


type Value
    = Const String
    | Field RowRef String


type RowRef
    = Before
    | After



-- CONDITION HELPERS


{-| Field value changed (before != after) -}
changed : String -> Condition
changed field =
    Neq (Field Before field) (Field After field)


{-| Field changed to a specific value -}
changedTo : String -> String -> Condition
changedTo field value =
    And (changed field) (Eq (Field After field) (Const value))


{-| Field changed from a specific value -}
changedFrom : String -> String -> Condition
changedFrom field value =
    And (changed field) (Eq (Field Before field) (Const value))


{-| Field is true after the operation -}
isTrue : RowRef -> String -> Condition
isTrue ref field =
    Eq (Field ref field) (Const "true")


{-| Field is false after the operation -}
isFalse : RowRef -> String -> Condition
isFalse ref field =
    Eq (Field ref field) (Const "false")
