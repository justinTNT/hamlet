# Script API Design Specification

This document defines the exact surface area of the proposed `BuildAmp.Script` module.
This is a **Design Specification**, not an implementation.

## 1. Core Types

The `Script` type is a "Free Monad" describing a sequential process.

```elm
module BuildAmp.Script exposing 
    ( Script
    , succeed, fail
    , map, map2, andThen
    , do
    )

{-| A script that produces a value of type `a` -}
type Script a = Script -- opaque
```

## 2. Constructor Functions

Basic flow control primitives.

```elm
{-| complete the script successfully with a value -}
succeed : a -> Script a

{-| Fail the script with an error message -}
fail : String -> Script a
```

## 3. Composition (Chaining)

Standard monadic chaining.

```elm
{-| Chain two steps together -}
andThen : (a -> Script b) -> Script a -> Script b

{-| Transform the result of a script -}
map : (a -> b) -> Script a -> Script b

{-| Combine two scripts -}
map2 : (a -> b -> c) -> Script a -> Script b -> Script c
```

## 4. Capability Wrappers

These functions wrap the raw `Port` calls into `Script` steps.

```elm
module BuildAmp.Script.Db exposing (query, insert, update)

{-| Execute a raw SQL query -}
query : String -> List Param -> Script Results

{-| Insert a record -}
insert : String -> Value -> Script Id
```

```elm
module BuildAmp.Script.Http exposing (get, post)

{-| Make an HTTP GET request -}
get : String -> Script Value
```

## 5. Usage Example

This is how the user code will look:

```elm
handler : Request -> Script Response
handler req =
    Db.insert "items" (encodeItem req)
        |> Script.andThen (\itemId ->
            Script.map2 (\_ _ -> itemId)
                (Db.insert "logs" (logCreate itemId))
                (Http.post "webhook" (notifyPayload itemId))
        )
        |> Script.map (\itemId -> { id = itemId })
```

## 6. Runner Logic (Generated)

The generated `MyHandlerGen.elm` will essentially do this map:

```elm
type Msg = DbResult | HttpResult ...

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case (msg, model.script) of
        (DbResult res, Step (DbRequest _) next) ->
            let newScript = next res 
            in run newScript
        ...
```
