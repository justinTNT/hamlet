effect module Database where { command = MyCmd, subscription = MySub } exposing 
    ( find
    , create  
    , update
    , kill
    , DbRow
    )

import Dict exposing (Dict)
import Json.Decode as Decode
import Json.Encode as Encode
import Task exposing (Task)

type alias DbRow = Dict String Decode.Value

-- Database operations as Tasks
find : String -> List String -> Task String (List DbRow)
find sql params =
    command (Find sql params)

create : String -> Dict String Encode.Value -> Task String DbRow  
create table data =
    command (Create table data)

update : String -> Dict String Encode.Value -> String -> List String -> Task String DbRow
update table data whereClause whereParams =
    command (Update table data whereClause whereParams)

kill : String -> String -> List String -> Task String Int
kill table whereClause whereParams =
    command (Kill table whereClause whereParams)

-- Internal command type
type MyCmd msg
    = Find String (List String)
    | Create String (Dict String Encode.Value)
    | Update String (Dict String Encode.Value) String (List String)
    | Kill String String (List String)

type MySub msg = NoSub

-- Effect manager implementation
cmdMap : (a -> b) -> MyCmd a -> MyCmd b
cmdMap _ cmd =
    case cmd of
        Find sql params -> Find sql params
        Create table data -> Create table data  
        Update table data where_ params -> Update table data where_ params
        Kill table where_ params -> Kill table where_ params

subMap : (a -> b) -> MySub a -> MySub b
subMap _ _ = NoSub

init : Task Never State
init = Task.succeed {}

type alias State = {}

onEffects : Platform.Router msg Msg -> List (MyCmd msg) -> List (MySub msg) -> State -> Task Never State
onEffects router cmds subs state =
    -- Send database commands to JavaScript via ports
    Task.succeed state

onSelfMsg : Platform.Router msg Msg -> Msg -> State -> Task Never State  
onSelfMsg router msg state =
    Task.succeed state

type Msg = NoMsg