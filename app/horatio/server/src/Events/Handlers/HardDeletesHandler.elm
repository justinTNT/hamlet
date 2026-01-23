port module Events.Handlers.HardDeletesHandler exposing (main)

{-| HardDeletes Event Handler

Implements permanent deletion of soft-deleted records older than 30 days.
Deletes in FK-safe order: item_comments -> item_tags -> microblog_items -> guests

This is a scheduled event that runs via cron (e.g., daily at 2am) to clean up
records that have been soft-deleted and are past the retention period.

-}

import BuildAmp.Events exposing (EventContext, EventResult(..))
import BuildAmp.Database as DB
import Json.Encode as Encode
import Json.Decode as Decode
import Platform


retention_days = 30

-- MODEL (state + stage)

type alias Model =
    { stage : Stage
    , context : Maybe EventContext
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    , deleteCounts : DeleteCounts
    , pendingRequests : Int
    }


type Stage
    = Idle
    | DeletingComments
    | DeletingTags
    | DeletingItems
    | DeletingGuests
    | Complete EventResult
    | Failed String


type alias DeleteCounts =
    { comments : Int
    , tags : Int
    , items : Int
    , guests : Int
    }


type alias GlobalConfig = DB.GlobalConfig


type alias GlobalState =
    { eventCount : Int
    , lastActivity : Int
    }


-- UPDATE

type Msg
    = HandleEvent EventBundle
    | CommentsDeleted (Result String Int)
    | TagsDeleted (Result String Int)
    | ItemsDeleted (Result String Int)
    | GuestsDeleted (Result String Int)
    | DbResult DB.DbResponse


type alias EventBundle =
    { payload : Encode.Value
    , context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , context = Nothing
      , globalConfig = flags.globalConfig
      , globalState = flags.globalState
      , deleteCounts = { comments = 0, tags = 0, items = 0, guests = 0 }
      , pendingRequests = 0
      }
    , Cmd.none
    )


type alias Flags =
    { globalConfig : GlobalConfig
    , globalState : GlobalState
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        HandleEvent bundle ->
            case decodeEventBundle bundle of
                Ok ctx ->
                    let
                        -- Calculate cutoff: days before execution time
                        cutoffMs = ctx.executedAt - (retention_days * 24 * 60 * 60 * 1000)
                    in
                    ( { model
                      | stage = DeletingComments
                      , context = Just ctx
                      , pendingRequests = 1
                      }
                    , deleteOldComments cutoffMs
                    )

                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )

        CommentsDeleted result ->
            case result of
                Ok count ->
                    let
                        counts = model.deleteCounts
                        cutoffMs = getCutoff model
                    in
                    ( { model
                      | stage = DeletingTags
                      , deleteCounts = { counts | comments = count }
                      }
                    , deleteOldTags cutoffMs
                    )

                Err error ->
                    ( { model | stage = Failed ("Comments delete failed: " ++ error) }, Cmd.none )

        TagsDeleted result ->
            case result of
                Ok count ->
                    let
                        counts = model.deleteCounts
                        cutoffMs = getCutoff model
                    in
                    ( { model
                      | stage = DeletingItems
                      , deleteCounts = { counts | tags = count }
                      }
                    , deleteOldItems cutoffMs
                    )

                Err error ->
                    ( { model | stage = Failed ("Tags delete failed: " ++ error) }, Cmd.none )

        ItemsDeleted result ->
            case result of
                Ok count ->
                    let
                        counts = model.deleteCounts
                        cutoffMs = getCutoff model
                    in
                    ( { model
                      | stage = DeletingGuests
                      , deleteCounts = { counts | items = count }
                      }
                    , deleteOldGuests cutoffMs
                    )

                Err error ->
                    ( { model | stage = Failed ("Items delete failed: " ++ error) }, Cmd.none )

        GuestsDeleted result ->
            case result of
                Ok count ->
                    let
                        counts = model.deleteCounts
                        newCounts = { counts | guests = count }
                        totalDeleted = newCounts.comments + newCounts.tags + newCounts.items + newCounts.guests
                        successResult =
                            Success
                                { message = "Hard delete completed: " ++ String.fromInt totalDeleted ++ " records removed"
                                , recordsAffected = totalDeleted
                                }
                    in
                    ( { model
                      | stage = Complete successResult
                      , deleteCounts = newCounts
                      }
                    , Cmd.none
                    )

                Err error ->
                    ( { model | stage = Failed ("Guests delete failed: " ++ error) }, Cmd.none )

        DbResult response ->
            -- Route DB response to appropriate handler based on current stage
            case model.stage of
                DeletingComments ->
                    handleDeleteResponse response CommentsDeleted model

                DeletingTags ->
                    handleDeleteResponse response TagsDeleted model

                DeletingItems ->
                    handleDeleteResponse response ItemsDeleted model

                DeletingGuests ->
                    handleDeleteResponse response GuestsDeleted model

                _ ->
                    ( model, Cmd.none )


-- BUSINESS LOGIC

{-| Get cutoff timestamp from context
-}
getCutoff : Model -> Int
getCutoff model =
    case model.context of
        Just ctx ->
            ctx.executedAt - (retention_days * 24 * 60 * 60 * 1000)

        Nothing ->
            model.globalConfig.serverNow - (retention_days * 24 * 60 * 60 * 1000)


{-| Delete comments that were soft-deleted before cutoff
-}
deleteOldComments : Int -> Cmd Msg
deleteOldComments cutoffMs =
    dbKill
        { id = "delete_old_comments"
        , table = "item_comment"
        , whereClause = "deleted_at IS NOT NULL AND deleted_at < to_timestamp($1::bigint / 1000.0)"
        , params = [ String.fromInt cutoffMs ]
        }


{-| Delete tags associated with soft-deleted items before cutoff
-}
deleteOldTags : Int -> Cmd Msg
deleteOldTags cutoffMs =
    dbKill
        { id = "delete_old_tags"
        , table = "item_tag"
        , whereClause = "deleted_at IS NOT NULL AND deleted_at < to_timestamp($1::bigint / 1000.0)"
        , params = [ String.fromInt cutoffMs ]
        }


{-| Delete microblog items that were soft-deleted before cutoff
-}
deleteOldItems : Int -> Cmd Msg
deleteOldItems cutoffMs =
    dbKill
        { id = "delete_old_items"
        , table = "microblog_item"
        , whereClause = "deleted_at IS NOT NULL AND deleted_at < to_timestamp($1::bigint / 1000.0)"
        , params = [ String.fromInt cutoffMs ]
        }


{-| Delete guests that were soft-deleted before cutoff and have no active items
-}
deleteOldGuests : Int -> Cmd Msg
deleteOldGuests cutoffMs =
    dbKill
        { id = "delete_old_guests"
        , table = "guest"
        , whereClause = "deleted_at IS NOT NULL AND deleted_at < to_timestamp($1::bigint / 1000.0)"
        , params = [ String.fromInt cutoffMs ]
        }


{-| Handle DB response and convert to appropriate message
-}
handleDeleteResponse : DB.DbResponse -> (Result String Int -> Msg) -> Model -> ( Model, Cmd Msg )
handleDeleteResponse response toMsg model =
    let
        result =
            if response.success then
                case response.data of
                    Just data ->
                        -- Extract rowCount from response
                        case Decode.decodeValue (Decode.field "rowCount" Decode.int) data of
                            Ok count ->
                                Ok count

                            Err _ ->
                                Ok 0

                    Nothing ->
                        Ok 0
            else
                Err (Maybe.withDefault "Unknown error" response.error)
    in
    update (toMsg result) model


-- DECODING

decodeEventBundle : EventBundle -> Result String EventContext
decodeEventBundle bundle =
    Decode.decodeValue BuildAmp.Events.eventContextDecoder bundle.context
        |> Result.mapError Decode.errorToString


-- ENCODING

encodeEventResult : EventResult -> Encode.Value
encodeEventResult result =
    BuildAmp.Events.encodeEventResult result


-- PORTS

port handleEvent : (EventBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg
port dbKill : DB.DbKillRequest -> Cmd msg
port dbResult : (DB.DbResponse -> msg) -> Sub msg


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = updateWithResponse
        , subscriptions = subscriptions
        }


updateWithResponse : Msg -> Model -> ( Model, Cmd Msg )
updateWithResponse msg model =
    let
        ( newModel, cmd ) = update msg model
    in
    case newModel.stage of
        Complete result ->
            ( newModel
            , Cmd.batch
                [ complete (encodeEventResult result)
                , cmd
                ]
            )

        Failed error ->
            ( newModel
            , Cmd.batch
                [ complete (Encode.object [ ("success", Encode.bool False), ("error", Encode.string error) ])
                , cmd
                ]
            )

        _ ->
            ( newModel, cmd )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ handleEvent HandleEvent
        , dbResult DbResult
        ]
