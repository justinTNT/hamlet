port module Api.Handlers.GetFeedHandler exposing (main)

{-| GetFeed Handler

This handler was auto-generated as scaffolding. You can customize the business logic
while keeping the type signature intact.

@docs handleGetFeed

-}

import Api.Backend exposing (GetFeedReq, GetFeedRes, GetFeedReqBundle, DatabaseService)
import Task exposing (Task)
import Json.Encode as Encode
import Json.Decode as Decode
import Dict exposing (Dict)
import Platform


{-| Handle GetFeed request

Query the database for microblog items, comments, and tags for the given host.
Returns a complete feed with all associated data.

-}
handleGetFeed : GetFeedReqBundle -> DatabaseService -> Task String GetFeedRes  
handleGetFeed bundle db =
    -- Query database for microblog items and associated data
    let
        host = bundle.input.host
        userId = bundle.context.userId
        
        -- Query microblog items for this host
        itemsTask = 
            db.find """
                SELECT id, title, link, image, extract, owner_comment, timestamp
                FROM microblog_items 
                WHERE host = $1 
                ORDER BY timestamp DESC
                LIMIT 50
            """ [host]
    in
    itemsTask
        |> Task.andThen (\itemRows ->
            let
                itemIds = List.filterMap (\row -> 
                    Dict.get "id" row 
                        |> Maybe.andThen (\val -> 
                            case Json.Decode.decodeValue Json.Decode.string val of
                                Ok id -> Just id
                                Err _ -> Nothing
                        )
                ) itemRows
                
                -- Query comments for these items
                commentsTask = 
                    if List.isEmpty itemIds then
                        Task.succeed []
                    else
                        db.find """
                            SELECT c.id, c.item_id, c.parent_id, c.text, c.timestamp,
                                   g.name as author_name, c.guest_id
                            FROM item_comments c
                            LEFT JOIN guests g ON c.guest_id = g.id
                            WHERE c.item_id = ANY($1) AND c.host = $2
                            ORDER BY c.item_id, c.timestamp ASC
                        """ [String.join "," itemIds, host]
                
                -- Query tags for these items
                tagsTask =
                    if List.isEmpty itemIds then
                        Task.succeed []
                    else
                        db.find """
                            SELECT it.item_id, t.name as tag_name
                            FROM item_tags it
                            JOIN tags t ON it.tag_id = t.id
                            WHERE it.item_id = ANY($1) AND t.host = $2
                            ORDER BY it.item_id
                        """ [String.join "," itemIds, host]
            in
            Task.map2 (\comments tags ->
                -- TODO: Transform raw DB rows into proper MicroblogItem records
                -- This is where business logic goes - combining, filtering, sorting
                { items = [] } -- Placeholder for now
            ) commentsTask tagsTask
        )


{-| Helper to generate database effects

Example usage:
    queryEffect = queryDatabase "microblog_items" 
        [ ("host", request.host) 
        ]

-}
queryDatabase : String -> List ( String, String ) -> BackendEffect
queryDatabase table conditions =
    let
        queryJson =
            Encode.object
                [ ( "table", Encode.string table )
                , ( "conditions", Encode.object (List.map (\(k, v) -> (k, Encode.string v)) conditions) )
                ]
                |> Encode.encode 0
    in
    Log ("TODO: Implement database query for " ++ table)
    -- TODO: Create proper Query effect type and implementation


{-| Helper to generate insert effects

Example usage:
    insertEffect = insertIntoDatabase "microblog_items" 
        [ ("id", newId)
        , ("title", request.title)  
        , ("host", request.host)
        ]

-}
insertIntoDatabase : String -> List ( String, String ) -> BackendEffect
insertIntoDatabase table fields =
    let
        insertData =
            Encode.object (List.map (\(k, v) -> (k, Encode.string v)) fields)
                |> Encode.encode 0
    in
    Insert { table = table, data = insertData }


-- PORTS AND MAIN FOR JAVASCRIPT INTEROP WITH ASYNC TASKS

port process : (Decode.Value -> msg) -> Sub msg
port result : Encode.Value -> Cmd msg
port dbFind : { id : String, sql : String, params : List String } -> Cmd msg
port dbCreate : { id : String, table : String, data : Encode.Value } -> Cmd msg 
port dbUpdate : { id : String, table : String, data : Encode.Value, where : String, params : List String } -> Cmd msg
port dbKill : { id : String, table : String, where : String, params : List String } -> Cmd msg
port dbResult : (Decode.Value -> msg) -> Sub msg

type alias Model = 
    { pendingTasks : Dict String (Result String Decode.Value -> Model -> (Model, Cmd Msg))
    , taskCounter : Int
    }

type Msg 
    = ProcessRequest Decode.Value
    | DbResult Decode.Value

main : Program () Model Msg
main =
    Platform.worker
        { init = \_ -> ( { pendingTasks = Dict.empty, taskCounter = 0 }, Cmd.none )
        , update = update
        , subscriptions = subscriptions
        }

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ProcessRequest value ->
            case Decode.decodeValue Api.Backend.getFeedReqBundleDecoder value of
                Ok bundle ->
                    -- Start async Task execution
                    executeTaskHandler bundle model
                
                Err error ->
                    let
                        errorJson = Encode.object 
                            [ ( "error", Encode.string (Decode.errorToString error) ) ]
                    in
                    ( model, result errorJson )
        
        DbResult value ->
            -- Handle database operation result
            handleDbResult value model

executeTaskHandler : GetFeedReqBundle -> Model -> (Model, Cmd Msg)
executeTaskHandler bundle model =
    -- TODO: Execute the async Task-based handler
    -- For now, placeholder
    ( model, result (Api.Backend.getFeedResEncoder { items = [] }) )

handleDbResult : Decode.Value -> Model -> (Model, Cmd Msg)
handleDbResult value model =
    -- TODO: Process database result and continue Task chain
    ( model, Cmd.none )

subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ process ProcessRequest
        , dbResult DbResult
        ]
