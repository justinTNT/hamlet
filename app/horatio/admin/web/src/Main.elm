port module Main exposing (main)

{-| Schema-Driven Admin Interface

A generic admin shell that reads schema.json at runtime and dynamically
renders tables and forms. No code generation needed when models change.

"Rust once, UI never" - the UI adapts to schema changes automatically.
-}

import Browser
import Browser.Events
import Browser.Navigation as Nav
import Dict exposing (Dict)
import BuildAmp.Storage.AdminPreferences as Prefs
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Attributes as Attr
import Html.Events exposing (..)
import Http
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Url
import Url.Parser as Parser exposing ((</>), Parser)



-- PORTS


port adminApiRequest : AdminApiRequest -> Cmd msg


port adminApiResponse : (AdminApiResponse -> msg) -> Sub msg


port debugLog : String -> Cmd msg



-- TYPES


type alias AdminApiRequest =
    { method : String
    , endpoint : String
    , body : Maybe Encode.Value
    , correlationId : String
    }


type alias AdminApiResponse =
    { correlationId : String
    , success : Bool
    , data : Maybe Encode.Value
    , error : Maybe String
    }


type alias Flags =
    { adminToken : String
    , baseUrl : String
    , basePath : String
    }



-- SCHEMA TYPES (decoded from schema.json)


type alias Schema =
    { tables : Dict String TableSchema
    , relationships : List Relationship
    , manyToManyRelationships : List M2MRelationship
    }


type alias M2MRelationship =
    { table1 : String
    , table2 : String
    , joinTable : String
    }


type alias TableSchema =
    { structName : String
    , tableName : String
    , sourceFile : String
    , fields : Dict String FieldSchema
    , primaryKey : Maybe String
    , foreignKeys : List ForeignKey
    , referencedBy : List Reference
    , isJoinTable : Bool
    }


type alias FieldSchema =
    { rustType : String
    , sqlType : String
    , nullable : Bool
    , isPrimaryKey : Bool
    , isTimestamp : Bool
    , isLink : Bool
    , isRichContent : Bool
    , isEnumLike : Bool
    , enumValues : List String
    }


type alias ForeignKey =
    { column : String
    , references : Reference
    }


type alias Reference =
    { table : String
    , column : String
    }


type alias Relationship =
    { from : Reference
    , to : Reference
    , relationType : String
    }


type alias FkOption =
    { id : String
    , label : String
    }


type alias ResizeState =
    { table : String
    , column : String
    , startX : Float
    , startWidth : Int
    }



-- MODEL


type alias Model =
    { key : Nav.Key
    , url : Url.Url
    , route : Route
    , adminToken : String
    , baseUrl : String
    , basePath : String
    , schema : Maybe Schema
    , currentTable : Maybe String
    , currentRecordId : Maybe String
    , records : List Encode.Value
    , formData : Dict String String
    , fkOptions : Dict String (List FkOption)
    , relatedRecords : Dict String (List Encode.Value)
    , m2mLinkedIds : Dict String (List String)
    , m2mOptions : Dict String (List FkOption)
    , loading : Bool
    , error : Maybe String
    , correlationCounter : Int
    , sidebarCollapsed : Bool
    , sortField : String
    , sortDirection : SortDirection
    , pageOffset : Int
    , pageLimit : Int
    , totalRecords : Int
    , columnWidths : Dict String Int
    , resizing : Maybe ResizeState
    }


type SortDirection
    = Asc
    | Desc
    | NoSort


type Route
    = Home
    | TableList String
    | RecordEdit String String
    | RecordCreate String
    | NotFound



-- INIT


init : Flags -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url key =
    let
        model =
            { key = key
            , url = url
            , route = Home
            , adminToken = flags.adminToken
            , baseUrl = flags.baseUrl
            , basePath = flags.basePath
            , schema = Nothing
            , currentTable = Nothing
            , currentRecordId = Nothing
            , records = []
            , formData = Dict.empty
            , fkOptions = Dict.empty
            , relatedRecords = Dict.empty
            , m2mLinkedIds = Dict.empty
            , m2mOptions = Dict.empty
            , loading = True
            , error = Nothing
            , correlationCounter = 0
            , sidebarCollapsed = False
            , sortField = "created_at"
            , sortDirection = Desc
            , pageOffset = 0
            , pageLimit = 10
            , totalRecords = 0
            , columnWidths = Dict.empty
            , resizing = Nothing
            }
    in
    ( model, Cmd.batch [ fetchSchema model, Prefs.load ] )


fetchSchema : Model -> Cmd Msg
fetchSchema model =
    adminApiRequest
        { method = "GET"
        , endpoint = "schema"
        , body = Nothing
        , correlationId = "schema"
        }



-- ROUTING


routeParser : Parser (Route -> a) a
routeParser =
    Parser.oneOf
        [ Parser.map Home Parser.top
        , Parser.map TableList (Parser.s "table" </> Parser.string)
        , Parser.map (\t -> RecordCreate t) (Parser.s "table" </> Parser.string </> Parser.s "new")
        , Parser.map RecordEdit (Parser.s "table" </> Parser.string </> Parser.string)
        ]


parseRoute : Url.Url -> Route
parseRoute url =
    let
        cleanPath =
            if String.startsWith "/admin/ui" url.path then
                String.dropLeft 9 url.path

            else
                url.path

        modifiedUrl =
            { url | path = cleanPath }
    in
    Maybe.withDefault NotFound (Parser.parse routeParser modifiedUrl)


routeToPath : String -> Route -> String
routeToPath basePath route =
    let
        prefix =
            if String.endsWith "/" basePath then
                String.dropRight 1 basePath

            else
                basePath
    in
    case route of
        Home ->
            prefix ++ "/"

        TableList tableName ->
            prefix ++ "/table/" ++ tableName

        RecordEdit tableName recordId ->
            prefix ++ "/table/" ++ tableName ++ "/" ++ recordId

        RecordCreate tableName ->
            prefix ++ "/table/" ++ tableName ++ "/new"

        NotFound ->
            prefix ++ "/not-found"



-- UPDATE


type Msg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | ApiResponseReceived AdminApiResponse
    | NavigateToTable String
    | NavigateToCreate String
    | NavigateToEdit String String
    | UpdateFormField String String
    | ToggleM2M String String
    | SubmitForm
    | CancelForm
    | DeleteRecord String String
    | ClearError
    | ToggleSidebar
    | ToggleSort String
    | NextPage
    | PrevPage
    | PreferencesLoaded (Maybe Prefs.AdminPreferences)
    | StartResize String String Float Int
    | Resize Float
    | StopResize


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        LinkClicked urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Nav.load href )

        UrlChanged url ->
            let
                route =
                    parseRoute url

                -- Detect if we're navigating to a different table
                newTableName =
                    case route of
                        TableList name ->
                            Just name

                        _ ->
                            Nothing

                isNewTable =
                    case ( newTableName, model.currentTable ) of
                        ( Just new, Just old ) ->
                            new /= old

                        ( Just _, Nothing ) ->
                            True

                        _ ->
                            False

                -- Clear form state when navigating to a new record edit to avoid stale data
                -- Reset pagination when navigating to a different table
                clearedModel =
                    case route of
                        RecordEdit _ _ ->
                            { model
                                | formData = Dict.empty
                                , m2mLinkedIds = Dict.empty
                                , m2mOptions = Dict.empty
                            }

                        RecordCreate _ ->
                            { model
                                | formData = Dict.empty
                                , m2mLinkedIds = Dict.empty
                                , m2mOptions = Dict.empty
                            }

                        TableList tableName ->
                            if isNewTable then
                                { model | pageOffset = 0, currentTable = Just tableName }

                            else
                                model

                        _ ->
                            model

                -- Only show loading spinner when we're actually fetching data
                shouldShowLoading =
                    case route of
                        RecordCreate _ ->
                            False  -- No record to fetch for create

                        _ ->
                            True
            in
            ( { clearedModel | url = url, route = route, error = Nothing, loading = shouldShowLoading }
            , loadRouteData clearedModel route
            )

        ApiResponseReceived response ->
            handleApiResponse model response

        NavigateToTable tableName ->
            ( { model | loading = True, currentTable = Just tableName, pageOffset = 0 }
            , Nav.pushUrl model.key (routeToPath model.basePath (TableList tableName))
            )

        NavigateToCreate tableName ->
            ( { model
                | currentTable = Just tableName
                , currentRecordId = Nothing
                , formData = Dict.empty
              }
            , Nav.pushUrl model.key (routeToPath model.basePath (RecordCreate tableName))
            )

        NavigateToEdit tableName recordId ->
            ( { model
                | loading = True
                , currentTable = Just tableName
                , currentRecordId = Just recordId
                , formData = Dict.empty
                , m2mLinkedIds = Dict.empty
                , m2mOptions = Dict.empty
              }
            , Nav.pushUrl model.key (routeToPath model.basePath (RecordEdit tableName recordId))
            )

        UpdateFormField fieldName value ->
            ( { model | formData = Dict.insert fieldName value model.formData }
            , Cmd.none
            )

        ToggleM2M relatedTable optionId ->
            let
                currentIds =
                    Dict.get relatedTable model.m2mLinkedIds
                        |> Maybe.withDefault []

                newIds =
                    if List.member optionId currentIds then
                        List.filter (\id -> id /= optionId) currentIds

                    else
                        optionId :: currentIds
            in
            ( { model | m2mLinkedIds = Dict.insert relatedTable newIds model.m2mLinkedIds }
            , Cmd.none
            )

        SubmitForm ->
            case model.currentTable of
                Just tableName ->
                    ( { model | loading = True }
                    , submitForm model tableName
                    )

                Nothing ->
                    ( model, Cmd.none )

        CancelForm ->
            case model.currentTable of
                Just tableName ->
                    ( { model | formData = Dict.empty, currentRecordId = Nothing }
                    , Nav.pushUrl model.key (routeToPath model.basePath (TableList tableName))
                    )

                Nothing ->
                    ( model, Nav.pushUrl model.key (routeToPath model.basePath Home) )

        DeleteRecord tableName recordId ->
            ( { model | loading = True }
            , deleteRecord model tableName recordId
            )

        ClearError ->
            ( { model | error = Nothing }, Cmd.none )

        ToggleSidebar ->
            ( { model | sidebarCollapsed = not model.sidebarCollapsed }, Cmd.none )

        ToggleSort fieldName ->
            let
                ( newSortField, newSortDirection ) =
                    if model.sortField == fieldName then
                        -- Toggle direction: Asc -> Desc -> Asc
                        case model.sortDirection of
                            Asc ->
                                ( fieldName, Desc )

                            Desc ->
                                ( fieldName, Asc )

                            NoSort ->
                                ( fieldName, Asc )

                    else
                        -- New field, start with Desc (newest first usually makes sense)
                        ( fieldName, Desc )

                newModel =
                    { model
                        | sortField = newSortField
                        , sortDirection = newSortDirection
                        , pageOffset = 0
                        , loading = True
                    }
            in
            case model.currentTable of
                Just tableName ->
                    ( newModel, loadRecords newModel tableName )

                Nothing ->
                    ( newModel, Cmd.none )

        NextPage ->
            let
                newOffset =
                    model.pageOffset + model.pageLimit

                newModel =
                    { model | pageOffset = newOffset, loading = True }
            in
            case model.currentTable of
                Just tableName ->
                    ( newModel, loadRecords newModel tableName )

                Nothing ->
                    ( newModel, Cmd.none )

        PrevPage ->
            let
                newOffset =
                    Basics.max 0 (model.pageOffset - model.pageLimit)

                newModel =
                    { model | pageOffset = newOffset, loading = True }
            in
            case model.currentTable of
                Just tableName ->
                    ( newModel, loadRecords newModel tableName )

                Nothing ->
                    ( newModel, Cmd.none )

        PreferencesLoaded maybePrefs ->
            case maybePrefs of
                Just prefs ->
                    ( { model | columnWidths = decodeColumnWidths prefs.columnWidthsJson }
                    , Cmd.none
                    )

                Nothing ->
                    ( model, Cmd.none )

        StartResize tableName columnName startX currentWidth ->
            ( { model
                | resizing =
                    Just
                        { table = tableName
                        , column = columnName
                        , startX = startX
                        , startWidth = currentWidth
                        }
              }
            , debugLog ("StartResize: " ++ tableName ++ "." ++ columnName ++ " at " ++ String.fromFloat startX)
            )

        Resize mouseX ->
            case model.resizing of
                Just state ->
                    let
                        delta =
                            round (mouseX - state.startX)

                        newWidth =
                            clamp 60 500 (state.startWidth + delta)

                        widthKey =
                            state.table ++ "." ++ state.column
                    in
                    ( { model | columnWidths = Dict.insert widthKey newWidth model.columnWidths }
                    , debugLog ("Resize: " ++ widthKey ++ " = " ++ String.fromInt newWidth)
                    )

                Nothing ->
                    ( model, Cmd.none )

        StopResize ->
            ( { model | resizing = Nothing }
            , saveColumnWidths model.columnWidths
            )


loadRouteData : Model -> Route -> Cmd Msg
loadRouteData model route =
    case route of
        TableList tableName ->
            loadRecords model tableName

        RecordEdit tableName recordId ->
            Cmd.batch
                [ loadRecord model tableName recordId
                , loadFkOptionsForTable model tableName
                , loadRelatedRecordsForTable model tableName recordId
                , loadM2MDataForTable model tableName recordId
                ]

        RecordCreate tableName ->
            loadFkOptionsForTable model tableName

        _ ->
            Cmd.none


loadM2MDataForTable : Model -> String -> String -> Cmd Msg
loadM2MDataForTable model tableName recordId =
    case model.schema of
        Just schema ->
            loadAllM2MDataForTable model schema tableName recordId

        Nothing ->
            Cmd.none


loadFkOptionsForTable : Model -> String -> Cmd Msg
loadFkOptionsForTable model tableName =
    case model.schema of
        Just schema ->
            case Dict.get tableName schema.tables of
                Just tableSchema ->
                    loadAllFkOptionsForTable model tableSchema

                Nothing ->
                    Cmd.none

        Nothing ->
            Cmd.none


loadRelatedRecordsForTable : Model -> String -> String -> Cmd Msg
loadRelatedRecordsForTable model tableName recordId =
    case model.schema of
        Just schema ->
            case Dict.get tableName schema.tables of
                Just tableSchema ->
                    loadAllRelatedRecordsForTable model tableName recordId tableSchema

                Nothing ->
                    Cmd.none

        Nothing ->
            Cmd.none


handleApiResponse : Model -> AdminApiResponse -> ( Model, Cmd Msg )
handleApiResponse model response =
    if response.correlationId == "schema" then
        -- Schema response
        case response.data of
            Just data ->
                case Decode.decodeValue schemaDecoder data of
                    Ok schema ->
                        let
                            route =
                                parseRoute model.url
                        in
                        ( { model | schema = Just schema, loading = False, route = route }
                        , loadRouteData { model | schema = Just schema } route
                        )

                    Err err ->
                        ( { model | error = Just ("Schema decode error: " ++ Decode.errorToString err), loading = False }
                        , Cmd.none
                        )

            Nothing ->
                ( { model | error = Just "No schema data received", loading = False }, Cmd.none )

    else if String.startsWith "options-" response.correlationId then
        -- FK options response
        let
            fkTableName =
                String.dropLeft 8 response.correlationId
        in
        case response.data of
            Just data ->
                case Decode.decodeValue (Decode.list fkOptionDecoder) data of
                    Ok options ->
                        ( { model | fkOptions = Dict.insert fkTableName options model.fkOptions }
                        , Cmd.none
                        )

                    Err _ ->
                        -- Silently ignore decode errors for options
                        ( model, Cmd.none )

            Nothing ->
                ( model, Cmd.none )

    else if String.startsWith "related-" response.correlationId then
        -- Related records response
        let
            relatedTableName =
                String.dropLeft 8 response.correlationId
        in
        case response.data of
            Just data ->
                case Decode.decodeValue (Decode.list Decode.value) data of
                    Ok relRecords ->
                        ( { model | relatedRecords = Dict.insert relatedTableName relRecords model.relatedRecords }
                        , Cmd.none
                        )

                    Err _ ->
                        -- Silently ignore decode errors for related records
                        ( model, Cmd.none )

            Nothing ->
                ( model, Cmd.none )

    else if String.startsWith "m2m-" response.correlationId then
        -- M2M linked IDs response
        let
            relatedTableName =
                String.dropLeft 4 response.correlationId
        in
        case response.data of
            Just data ->
                case Decode.decodeValue (Decode.field "linkedIds" (Decode.list Decode.string)) data of
                    Ok linkedIds ->
                        ( { model | m2mLinkedIds = Dict.insert relatedTableName linkedIds model.m2mLinkedIds }
                        , Cmd.none
                        )

                    Err _ ->
                        ( model, Cmd.none )

            Nothing ->
                ( model, Cmd.none )

    else if String.startsWith "m2mopts-" response.correlationId then
        -- M2M options response
        let
            relatedTableName =
                String.dropLeft 8 response.correlationId
        in
        case response.data of
            Just data ->
                case Decode.decodeValue (Decode.list fkOptionDecoder) data of
                    Ok options ->
                        ( { model | m2mOptions = Dict.insert relatedTableName options model.m2mOptions }
                        , Cmd.none
                        )

                    Err _ ->
                        ( model, Cmd.none )

            Nothing ->
                ( model, Cmd.none )

    else if String.startsWith "m2msave-" response.correlationId then
        -- M2M save response - just ignore
        ( model, Cmd.none )

    else if String.startsWith "list-" response.correlationId then
        -- Paginated list response: {data: [...], total: N, offset: N, limit: N}
        case response.data of
            Just data ->
                case Decode.decodeValue paginatedResponseDecoder data of
                    Ok paginated ->
                        ( { model
                            | loading = False
                            , records = paginated.data
                            , totalRecords = paginated.total
                            , pageOffset = paginated.offset
                            , pageLimit = paginated.limit
                            , error = Nothing
                          }
                        , Cmd.none
                        )

                    Err err ->
                        ( { model | error = Just ("Decode error: " ++ Decode.errorToString err), loading = False }
                        , Cmd.none
                        )

            Nothing ->
                ( { model | error = Just "No data in list response", loading = False }, Cmd.none )

    else if response.success then
        case response.data of
            Just data ->
                -- Try single object (record response)
                case Decode.decodeValue Decode.value data of
                    Ok record ->
                        case model.route of
                            RecordEdit _ _ ->
                                -- Populate form from record
                                ( { model
                                    | loading = False
                                    , formData = extractFormData record
                                    , error = Nothing
                                  }
                                , Cmd.none
                                )

                            RecordCreate tableName ->
                                -- Successful create - go back to list
                                ( { model | loading = False, formData = Dict.empty, currentRecordId = Nothing }
                                , Nav.pushUrl model.key (routeToPath model.basePath (TableList tableName))
                                )

                            _ ->
                                -- Successful update - go back to list
                                case model.currentTable of
                                    Just tableName ->
                                        ( { model | loading = False, formData = Dict.empty }
                                        , Nav.pushUrl model.key (routeToPath model.basePath (TableList tableName))
                                        )

                                    Nothing ->
                                        ( { model | loading = False, records = [ record ] }, Cmd.none )

                    Err err ->
                        ( { model | error = Just ("Decode error: " ++ Decode.errorToString err), loading = False }
                        , Cmd.none
                        )

            Nothing ->
                -- Successful delete (no content)
                case model.currentTable of
                    Just tableName ->
                        ( { model | loading = False }
                        , loadRecords model tableName
                        )

                    Nothing ->
                        ( { model | loading = False }, Cmd.none )

    else
        ( { model | error = response.error, loading = False }, Cmd.none )


extractFormData : Encode.Value -> Dict String String
extractFormData value =
    case Decode.decodeValue (Decode.dict Decode.value) value of
        Ok dict ->
            Dict.map (\_ v -> valueToString v) dict

        Err _ ->
            Dict.empty


valueToString : Encode.Value -> String
valueToString value =
    case Decode.decodeValue Decode.string value of
        Ok s ->
            s

        Err _ ->
            case Decode.decodeValue Decode.int value of
                Ok i ->
                    String.fromInt i

                Err _ ->
                    case Decode.decodeValue Decode.float value of
                        Ok f ->
                            String.fromFloat f

                        Err _ ->
                            case Decode.decodeValue Decode.bool value of
                                Ok b ->
                                    if b then
                                        "true"

                                    else
                                        "false"

                                Err _ ->
                                    Encode.encode 0 value



-- API COMMANDS


loadRecords : Model -> String -> Cmd Msg
loadRecords model tableName =
    let
        sortDir =
            case model.sortDirection of
                Asc ->
                    "asc"

                Desc ->
                    "desc"

                NoSort ->
                    "desc"

        queryParams =
            "?sort=" ++ model.sortField
                ++ "&dir=" ++ sortDir
                ++ "&offset=" ++ String.fromInt model.pageOffset
                ++ "&limit=" ++ String.fromInt model.pageLimit
    in
    adminApiRequest
        { method = "GET"
        , endpoint = tableName ++ queryParams
        , body = Nothing
        , correlationId = "list-" ++ tableName
        }


loadRecord : Model -> String -> String -> Cmd Msg
loadRecord model tableName recordId =
    adminApiRequest
        { method = "GET"
        , endpoint = tableName ++ "/" ++ recordId
        , body = Nothing
        , correlationId = "get-" ++ tableName ++ "-" ++ recordId
        }


submitForm : Model -> String -> Cmd Msg
submitForm model tableName =
    let
        body =
            Encode.object
                (Dict.toList model.formData
                    |> List.map (\( k, v ) -> ( k, Encode.string v ))
                )

        ( method, endpoint ) =
            case model.currentRecordId of
                Just recordId ->
                    ( "PUT", tableName ++ "/" ++ recordId )

                Nothing ->
                    ( "POST", tableName )

        formSubmitCmd =
            adminApiRequest
                { method = method
                , endpoint = endpoint
                , body = Just body
                , correlationId = "submit-" ++ tableName
                }

        -- Also save M2M changes if editing an existing record
        m2mCmd =
            case model.currentRecordId of
                Just recordId ->
                    saveM2MChanges model tableName recordId

                Nothing ->
                    Cmd.none
    in
    Cmd.batch [ formSubmitCmd, m2mCmd ]


deleteRecord : Model -> String -> String -> Cmd Msg
deleteRecord model tableName recordId =
    adminApiRequest
        { method = "DELETE"
        , endpoint = tableName ++ "/" ++ recordId
        , body = Nothing
        , correlationId = "delete-" ++ tableName ++ "-" ++ recordId
        }


loadFkOptions : Model -> String -> Cmd Msg
loadFkOptions model fkTableName =
    adminApiRequest
        { method = "GET"
        , endpoint = fkTableName ++ "/options"
        , body = Nothing
        , correlationId = "options-" ++ fkTableName
        }


loadAllFkOptionsForTable : Model -> TableSchema -> Cmd Msg
loadAllFkOptionsForTable model tableSchema =
    tableSchema.foreignKeys
        |> List.map (\fk -> loadFkOptions model fk.references.table)
        |> Cmd.batch


loadRelatedRecords : Model -> String -> String -> String -> Cmd Msg
loadRelatedRecords model tableName recordId relatedTable =
    adminApiRequest
        { method = "GET"
        , endpoint = tableName ++ "/" ++ recordId ++ "/related/" ++ relatedTable
        , body = Nothing
        , correlationId = "related-" ++ relatedTable
        }


loadAllRelatedRecordsForTable : Model -> String -> String -> TableSchema -> Cmd Msg
loadAllRelatedRecordsForTable model tableName recordId tableSchema =
    tableSchema.referencedBy
        |> List.map (\ref -> loadRelatedRecords model tableName recordId ref.table)
        |> Cmd.batch


loadM2MLinkedIds : Model -> String -> String -> String -> Cmd Msg
loadM2MLinkedIds model tableName recordId relatedTable =
    adminApiRequest
        { method = "GET"
        , endpoint = tableName ++ "/" ++ recordId ++ "/m2m/" ++ relatedTable
        , body = Nothing
        , correlationId = "m2m-" ++ relatedTable
        }


loadM2MOptionsForTable : Model -> String -> Cmd Msg
loadM2MOptionsForTable model relatedTable =
    adminApiRequest
        { method = "GET"
        , endpoint = relatedTable ++ "/options"
        , body = Nothing
        , correlationId = "m2mopts-" ++ relatedTable
        }


loadAllM2MDataForTable : Model -> Schema -> String -> String -> Cmd Msg
loadAllM2MDataForTable model schema tableName recordId =
    let
        -- Find M2M relationships where this table is involved
        relevantM2Ms =
            schema.manyToManyRelationships
                |> List.filterMap
                    (\m2m ->
                        if m2m.table1 == tableName then
                            Just m2m.table2

                        else if m2m.table2 == tableName then
                            Just m2m.table1

                        else
                            Nothing
                    )
    in
    Cmd.batch
        (List.concatMap
            (\relatedTable ->
                [ loadM2MLinkedIds model tableName recordId relatedTable
                , loadM2MOptionsForTable model relatedTable
                ]
            )
            relevantM2Ms
        )


saveM2MChanges : Model -> String -> String -> Cmd Msg
saveM2MChanges model tableName recordId =
    case model.schema of
        Just schema ->
            let
                relevantM2Ms =
                    schema.manyToManyRelationships
                        |> List.filterMap
                            (\m2m ->
                                if m2m.table1 == tableName then
                                    Just m2m.table2

                                else if m2m.table2 == tableName then
                                    Just m2m.table1

                                else
                                    Nothing
                            )
            in
            Cmd.batch
                (List.map
                    (\relatedTable ->
                        let
                            linkedIds =
                                Dict.get relatedTable model.m2mLinkedIds
                                    |> Maybe.withDefault []

                            body =
                                Encode.object
                                    [ ( "linkedIds", Encode.list Encode.string linkedIds ) ]
                        in
                        adminApiRequest
                            { method = "PUT"
                            , endpoint = tableName ++ "/" ++ recordId ++ "/m2m/" ++ relatedTable
                            , body = Just body
                            , correlationId = "m2msave-" ++ relatedTable
                            }
                    )
                    relevantM2Ms
                )

        Nothing ->
            Cmd.none



-- SCHEMA DECODER


schemaDecoder : Decoder Schema
schemaDecoder =
    Decode.map3 Schema
        (Decode.field "tables" (Decode.dict tableSchemaDecoder))
        (Decode.field "relationships" (Decode.list relationshipDecoder))
        (Decode.oneOf
            [ Decode.field "manyToManyRelationships" (Decode.list m2mRelationshipDecoder)
            , Decode.succeed []
            ]
        )


m2mRelationshipDecoder : Decoder M2MRelationship
m2mRelationshipDecoder =
    Decode.map3 M2MRelationship
        (Decode.field "table1" Decode.string)
        (Decode.field "table2" Decode.string)
        (Decode.field "joinTable" Decode.string)


tableSchemaDecoder : Decoder TableSchema
tableSchemaDecoder =
    Decode.map8 TableSchema
        (Decode.field "structName" Decode.string)
        (Decode.field "tableName" Decode.string)
        (Decode.field "sourceFile" Decode.string)
        (Decode.field "fields" (Decode.dict fieldSchemaDecoder))
        (Decode.field "primaryKey" (Decode.nullable Decode.string))
        (Decode.field "foreignKeys" (Decode.list foreignKeyDecoder))
        (Decode.field "referencedBy" (Decode.list referenceDecoder))
        (Decode.oneOf
            [ Decode.field "isJoinTable" Decode.bool
            , Decode.succeed False
            ]
        )


fieldSchemaDecoder : Decoder FieldSchema
fieldSchemaDecoder =
    Decode.map8 FieldSchema
        (Decode.field "rustType" Decode.string)
        (Decode.field "sqlType" Decode.string)
        (Decode.field "nullable" Decode.bool)
        (Decode.field "isPrimaryKey" Decode.bool)
        (Decode.field "isTimestamp" Decode.bool)
        (Decode.oneOf [ Decode.field "isLink" Decode.bool, Decode.succeed False ])
        (Decode.oneOf [ Decode.field "isRichContent" Decode.bool, Decode.succeed False ])
        (Decode.oneOf [ Decode.field "isEnumLike" Decode.bool, Decode.succeed False ])
        |> Decode.andThen
            (\partial ->
                Decode.oneOf [ Decode.field "enumValues" (Decode.list Decode.string), Decode.succeed [] ]
                    |> Decode.map (\enumVals -> partial enumVals)
            )


foreignKeyDecoder : Decoder ForeignKey
foreignKeyDecoder =
    Decode.map2 ForeignKey
        (Decode.field "column" Decode.string)
        (Decode.field "references" referenceDecoder)


referenceDecoder : Decoder Reference
referenceDecoder =
    Decode.map2 Reference
        (Decode.field "table" Decode.string)
        (Decode.field "column" Decode.string)


relationshipDecoder : Decoder Relationship
relationshipDecoder =
    Decode.map3 Relationship
        (Decode.field "from" referenceDecoder)
        (Decode.field "to" referenceDecoder)
        (Decode.field "type" Decode.string)


fkOptionDecoder : Decoder FkOption
fkOptionDecoder =
    Decode.map2 FkOption
        (Decode.field "id" Decode.string)
        (Decode.field "label" Decode.string)


type alias PaginatedResponse =
    { data : List Encode.Value
    , total : Int
    , offset : Int
    , limit : Int
    }


paginatedResponseDecoder : Decoder PaginatedResponse
paginatedResponseDecoder =
    Decode.map4 PaginatedResponse
        (Decode.field "data" (Decode.list Decode.value))
        (Decode.field "total" Decode.int)
        (Decode.field "offset" Decode.int)
        (Decode.field "limit" Decode.int)



-- VIEW


view : Model -> Browser.Document Msg
view model =
    { title = "Admin"
    , body =
        [ div [ class "admin-container" ]
            [ viewHeader model
            , div
                [ classList
                    [ ( "admin-layout", True )
                    , ( "sidebar-collapsed", model.sidebarCollapsed )
                    ]
                ]
                [ viewSidebar model
                , div [ class "admin-main" ]
                    [ viewError model.error
                    , viewContent model
                    ]
                ]
            ]
        ]
    }


viewHeader : Model -> Html Msg
viewHeader model =
    div [ class "admin-header" ]
        [ div [ class "header-left" ]
            [ a [ href (routeToPath model.basePath Home), class "header-brand" ]
                [ text "Admin" ]
            ]
        ]


viewSidebar : Model -> Html Msg
viewSidebar model =
    div [ class "admin-sidebar" ]
        [ div [ class "sidebar-header" ]
            [ if model.sidebarCollapsed then
                text ""

              else
                h2 [] [ text "Tables" ]
            , button
                [ class "sidebar-toggle"
                , onClick ToggleSidebar
                ]
                [ text
                    (if model.sidebarCollapsed then
                        ">"

                     else
                        "<"
                    )
                ]
            ]
        , if model.sidebarCollapsed then
            text ""

          else
            case model.schema of
                Just schema ->
                    let
                        -- Hide join tables from sidebar
                        visibleTables =
                            Dict.toList schema.tables
                                |> List.filter (\( _, t ) -> not t.isJoinTable)
                                |> List.sortBy Tuple.first
                    in
                    ul [ class "table-list" ]
                        (List.map (viewTableLink model) visibleTables)

                Nothing ->
                    p [] [ text "Loading schema..." ]
        ]


viewTableLink : Model -> ( String, TableSchema ) -> Html Msg
viewTableLink model ( tableName, tableSchema ) =
    let
        isActive =
            model.currentTable == Just tableName
    in
    li
        [ classList [ ( "active", isActive ) ] ]
        [ a
            [ href (routeToPath model.basePath (TableList tableName))
            , onClick (NavigateToTable tableName)
            ]
            [ text tableSchema.structName ]
        ]


viewError : Maybe String -> Html Msg
viewError maybeError =
    case maybeError of
        Just errorMsg ->
            div [ class "error-banner" ]
                [ span [] [ text errorMsg ]
                , button [ onClick ClearError ] [ text "x" ]
                ]

        Nothing ->
            text ""


viewContent : Model -> Html Msg
viewContent model =
    if model.loading && model.schema == Nothing then
        div [ class "loading" ] [ text "Loading..." ]

    else
        case model.route of
            Home ->
                viewHome model

            TableList tableName ->
                viewTableList model tableName

            RecordEdit tableName recordId ->
                viewRecordForm model tableName (Just recordId)

            RecordCreate tableName ->
                viewRecordForm model tableName Nothing

            NotFound ->
                div [] [ h2 [] [ text "Not Found" ] ]


viewHome : Model -> Html Msg
viewHome model =
    div [ class "home" ]
        [ h1 [] [ text "Admin Dashboard" ]
        , p [] [ text "Select a table from the sidebar to manage records." ]
        , case model.schema of
            Just schema ->
                let
                    -- Hide join tables from home page too
                    visibleTables =
                        Dict.toList schema.tables
                            |> List.filter (\( _, t ) -> not t.isJoinTable)
                            |> List.sortBy Tuple.first
                in
                div []
                    [ h3 [] [ text "Available Tables" ]
                    , ul []
                        (List.map
                            (\( name, tbl ) ->
                                li []
                                    [ a [ href "#", onClick (NavigateToTable name) ]
                                        [ text (tbl.structName ++ " (" ++ String.fromInt (Dict.size tbl.fields) ++ " fields)") ]
                                    ]
                            )
                            visibleTables
                        )
                    ]

            Nothing ->
                text ""
        ]


viewTableList : Model -> String -> Html Msg
viewTableList model tableName =
    case model.schema of
        Just schema ->
            case Dict.get tableName schema.tables of
                Just tableSchema ->
                    div [ class "table-view" ]
                        [ div [ class "table-header" ]
                            [ h2 [] [ text tableSchema.structName ]
                            , button
                                [ class "btn btn-primary"
                                , onClick (NavigateToCreate tableName)
                                ]
                                [ text "+ New" ]
                            ]
                        , if model.loading then
                            p [] [ text "Loading..." ]

                          else
                            viewDataTable model tableName tableSchema
                        ]

                Nothing ->
                    div [] [ text ("Unknown table: " ++ tableName) ]

        Nothing ->
            div [] [ text "Schema not loaded" ]


viewDataTable : Model -> String -> TableSchema -> Html Msg
viewDataTable model tableName tableSchema =
    let
        -- Filter out framework-managed fields
        isFrameworkField fs =
            fs.rustType == "SoftDelete" || fs.rustType == "MultiTenant"

        fieldNames =
            Dict.toList tableSchema.fields
                |> List.filter (\( _, fs ) -> not (isFrameworkField fs))
                |> List.map Tuple.first
                |> List.sortBy
                    (\name ->
                        if name == "id" then
                            "0"

                        else if name == "created_at" then
                            "zzz"

                        else
                            name
                    )

        isSortable : String -> Bool
        isSortable fieldName =
            case Dict.get fieldName tableSchema.fields of
                Just fs ->
                    fs.isPrimaryKey || fs.isTimestamp

                Nothing ->
                    False

        isForeignKey : String -> Bool
        isForeignKey fieldName =
            List.any (\fk -> fk.column == fieldName) tableSchema.foreignKeys

        sortIndicator : String -> String
        sortIndicator fieldName =
            if model.sortField == fieldName then
                case model.sortDirection of
                    Asc ->
                        " ▲"

                    Desc ->
                        " ▼"

                    NoSort ->
                        ""

            else
                ""

        defaultWidth =
            150

        viewColumnHeader : String -> Html Msg
        viewColumnHeader fieldName =
            let
                -- Default widths: sortable/FK get 120px, others get 150px
                defaultForField =
                    if isSortable fieldName || isForeignKey fieldName then
                        120
                    else
                        defaultWidth

                currentWidth =
                    getColumnWidth tableName fieldName model.columnWidths
                        |> Maybe.withDefault defaultForField

                widthPx =
                    String.fromInt currentWidth ++ "px"

                widthStyles =
                    [ style "width" widthPx
                    , style "min-width" widthPx
                    ]

                resizeHandle =
                    span
                        [ class "resize-handle"
                        , onMouseDownWithPosition (\x -> StartResize tableName fieldName x currentWidth)
                        ]
                        []
            in
            if isSortable fieldName then
                -- Sortable columns - click text to sort, drag handle to resize
                th
                    ([ class "sortable"
                     , attribute "data-column-name" fieldName
                     ]
                        ++ widthStyles
                    )
                    [ span [ onClick (ToggleSort fieldName) ]
                        [ text (snakeToTitle fieldName ++ sortIndicator fieldName) ]
                    , resizeHandle
                    ]

            else if isForeignKey fieldName then
                -- Foreign key columns - resizable
                th
                    ([ attribute "data-column-name" fieldName ] ++ widthStyles)
                    [ text (snakeToTitle fieldName)
                    , resizeHandle
                    ]

            else
                -- Text columns - resizable
                th
                    ([ attribute "data-column-name" fieldName ] ++ widthStyles)
                    [ text (snakeToTitle fieldName)
                    , resizeHandle
                    ]

    in
    div []
        [ table
            [ class "data-table"
            , classList [ ( "resizing", model.resizing /= Nothing ) ]
            , attribute "data-table-name" tableName
            ]
            [ thead []
                [ tr []
                    (List.map viewColumnHeader fieldNames)
                ]
            , tbody []
                (List.map (viewDataRow model tableName fieldNames tableSchema) model.records)
            ]
        , viewPagination model
        ]


viewPagination : Model -> Html Msg
viewPagination model =
    let
        currentPage =
            (model.pageOffset // model.pageLimit) + 1

        totalPages =
            ceiling (toFloat model.totalRecords / toFloat model.pageLimit)

        hasPrev =
            model.pageOffset > 0

        hasNext =
            model.pageOffset + model.pageLimit < model.totalRecords

        startRecord =
            model.pageOffset + 1

        endRecord =
            Basics.min (model.pageOffset + model.pageLimit) model.totalRecords
    in
    div [ class "pagination" ]
        [ span [ class "pagination-info" ]
            [ text
                (if model.totalRecords == 0 then
                    "No records"

                 else
                    "Showing "
                        ++ String.fromInt startRecord
                        ++ "-"
                        ++ String.fromInt endRecord
                        ++ " of "
                        ++ String.fromInt model.totalRecords
                )
            ]
        , div [ class "pagination-controls" ]
            [ button
                [ class "btn btn-sm"
                , onClick PrevPage
                , disabled (not hasPrev)
                ]
                [ text "← Prev" ]
            , span [ class "pagination-page" ]
                [ text ("Page " ++ String.fromInt currentPage ++ " of " ++ String.fromInt totalPages) ]
            , button
                [ class "btn btn-sm"
                , onClick NextPage
                , disabled (not hasNext)
                ]
                [ text "Next →" ]
            ]
        ]


viewDataRow : Model -> String -> List String -> TableSchema -> Encode.Value -> Html Msg
viewDataRow model tableName fieldNames tableSchema record =
    let
        -- Find FK-like columns (ending in _id but not just "id")
        fkColumnNames =
            fieldNames
                |> List.filter (\name -> String.endsWith "_id" name)

        recordId =
            case tableSchema.primaryKey of
                Just pk ->
                    getFieldValue pk record

                Nothing ->
                    -- Try 'id' field first
                    case getFieldValue "id" record of
                        "" ->
                            -- Build composite key from FK columns
                            let
                                -- Use schema FK info if available, otherwise use detected FK columns
                                fkCols =
                                    if List.isEmpty tableSchema.foreignKeys then
                                        fkColumnNames
                                    else
                                        List.map .column tableSchema.foreignKeys

                                compositeKey =
                                    fkCols
                                        |> List.map (\col -> col ++ ":" ++ getFieldValue col record)
                                        |> List.filter (\pair -> not (String.endsWith ":" pair))
                                        |> String.join ","
                            in
                            compositeKey

                        id ->
                            id

        -- A valid simple ID doesn't contain composite key markers (colon followed by comma pattern)
        isCompositeKey =
            String.contains ":" recordId && String.contains "," recordId

        canEdit =
            recordId /= "" && not isCompositeKey

        -- Primary key field name
        pkField =
            tableSchema.primaryKey |> Maybe.withDefault "id"
    in
    tr []
        (List.map
            (\fieldName ->
                let
                    value =
                        getFieldValue fieldName record

                    fieldSchema =
                        Dict.get fieldName tableSchema.fields

                    -- Is this the primary key field?
                    isPkField =
                        fieldName == pkField
                in
                td []
                    [ if isPkField && canEdit then
                        -- Primary key is clickable link to edit form
                        a
                            [ href "#"
                            , onClick (NavigateToEdit tableName recordId)
                            , class "pk-link"
                            ]
                            [ text value ]

                      else
                        case fieldSchema of
                            Just fs ->
                                viewFieldValue fs fieldName value tableSchema

                            Nothing ->
                                text value
                    ]
            )
            fieldNames
        )


viewFieldValue : FieldSchema -> String -> String -> TableSchema -> Html Msg
viewFieldValue fieldSchema fieldName value tableSchema =
    -- Check if this is a foreign key
    let
        maybeFk =
            List.filter (\fk -> fk.column == fieldName) tableSchema.foreignKeys
                |> List.head
    in
    case maybeFk of
        Just fk ->
            -- Render as link to related table
            a
                [ href "#"
                , onClick (NavigateToEdit fk.references.table value)
                , class "fk-link"
                ]
                [ text value ]

        Nothing ->
            -- Render based on type
            if fieldSchema.isTimestamp then
                text (formatTimestamp value)

            else if fieldSchema.isLink then
                -- Render as clickable external link with truncated display
                if String.isEmpty value then
                    text ""

                else
                    a
                        [ href value
                        , target "_blank"
                        , rel "noopener noreferrer"
                        , class "external-link"
                        , title value
                        ]
                        [ text (truncateUrl 40 value) ]

            else if String.contains "JSONB" fieldSchema.sqlType then
                code [ class "json-preview" ] [ text (truncate 50 value) ]

            else
                text (truncate 100 value)


viewRecordForm : Model -> String -> Maybe String -> Html Msg
viewRecordForm model tableName maybeRecordId =
    case model.schema of
        Just schema ->
            case Dict.get tableName schema.tables of
                Just tableSchema ->
                    let
                        title =
                            case maybeRecordId of
                                Just _ ->
                                    "Edit " ++ tableSchema.structName

                                Nothing ->
                                    "New " ++ tableSchema.structName

                        -- Filter out system-managed fields
                        isFrameworkField fs =
                            fs.rustType == "SoftDelete" || fs.rustType == "MultiTenant"

                        editableFields =
                            Dict.toList tableSchema.fields
                                |> List.filter (\( _, fs ) -> not fs.isPrimaryKey && not fs.isTimestamp && not (isFrameworkField fs))
                                |> List.sortBy Tuple.first
                    in
                    div [ class "form-view" ]
                        [ h2 [] [ text title ]
                        , if model.loading then
                            p [] [ text "Loading..." ]

                          else
                            Html.form [ onSubmit SubmitForm ]
                                [ div [ class "form-fields" ]
                                    (List.map (viewFormField model tableSchema) editableFields)
                                , div [ class "form-actions" ]
                                    [ button [ type_ "submit", class "btn btn-primary" ] [ text "Save" ]
                                    , button [ type_ "button", class "btn", onClick CancelForm ] [ text "Cancel" ]
                                    , case maybeRecordId of
                                        Just recordId ->
                                            button
                                                [ type_ "button"
                                                , class "btn btn-danger"
                                                , onClick (DeleteRecord tableName recordId)
                                                ]
                                                [ text "Delete" ]

                                        Nothing ->
                                            text ""
                                    ]
                                ]
                        , case maybeRecordId of
                            Just _ ->
                                div []
                                    [ viewM2MSections model tableName
                                    , viewRelatedRecords model tableSchema
                                    ]

                            Nothing ->
                                text ""
                        ]

                Nothing ->
                    div [] [ text ("Unknown table: " ++ tableName) ]

        Nothing ->
            div [] [ text "Schema not loaded" ]


viewM2MSections : Model -> String -> Html Msg
viewM2MSections model tableName =
    case model.schema of
        Just schema ->
            let
                -- Find M2M relationships where this table is involved
                relevantM2Ms =
                    schema.manyToManyRelationships
                        |> List.filterMap
                            (\m2m ->
                                if m2m.table1 == tableName then
                                    Just m2m.table2

                                else if m2m.table2 == tableName then
                                    Just m2m.table1

                                else
                                    Nothing
                            )
            in
            if List.isEmpty relevantM2Ms then
                text ""

            else
                div []
                    (List.map (viewM2MSection model) relevantM2Ms)

        Nothing ->
            text ""


viewM2MSection : Model -> String -> Html Msg
viewM2MSection model relatedTable =
    let
        options =
            Dict.get relatedTable model.m2mOptions
                |> Maybe.withDefault []

        linkedIds =
            Dict.get relatedTable model.m2mLinkedIds
                |> Maybe.withDefault []
    in
    div [ class "m2m-section" ]
        [ h4 [] [ text (snakeToTitle relatedTable) ]
        , if List.isEmpty options then
            p [] [ text "Loading..." ]

          else
            div [ class "m2m-options" ]
                (List.map
                    (\opt ->
                        let
                            isSelected =
                                List.member opt.id linkedIds
                        in
                        label
                            [ classList [ ( "m2m-option", True ), ( "selected", isSelected ) ]
                            , onClick (ToggleM2M relatedTable opt.id)
                            ]
                            [ input
                                [ type_ "checkbox"
                                , checked isSelected
                                , Html.Events.stopPropagationOn "click" (Decode.succeed ( ToggleM2M relatedTable opt.id, True ))
                                ]
                                []
                            , text opt.label
                            ]
                    )
                    options
                )
        ]


viewRelatedRecords : Model -> TableSchema -> Html Msg
viewRelatedRecords model tableSchema =
    if List.isEmpty tableSchema.referencedBy then
        text ""

    else
        div [ class "related-records" ]
            [ h3 [] [ text "Related Records" ]
            , div []
                (List.map (viewRelatedTable model) tableSchema.referencedBy)
            ]


viewRelatedTable : Model -> Reference -> Html Msg
viewRelatedTable model ref =
    let
        relatedCount =
            Dict.get ref.table model.relatedRecords
                |> Maybe.map List.length
                |> Maybe.withDefault 0
    in
    div [ class "related-item" ]
        [ a
            [ href "#"
            , onClick (NavigateToTable ref.table)
            ]
            [ text (snakeToTitle ref.table) ]
        , span [ class "related-count" ]
            [ text (String.fromInt relatedCount ++ " record" ++ (if relatedCount /= 1 then "s" else "")) ]
        ]


viewFormField : Model -> TableSchema -> ( String, FieldSchema ) -> Html Msg
viewFormField model tableSchema ( fieldName, fieldSchema ) =
    let
        currentValue =
            Dict.get fieldName model.formData |> Maybe.withDefault ""

        inputType =
            sqlTypeToInputType fieldSchema

        isRequired =
            not fieldSchema.nullable

        maybeFk =
            List.filter (\fk -> fk.column == fieldName) tableSchema.foreignKeys
                |> List.head
    in
    div [ class "form-group" ]
        [ label [ for fieldName ]
            [ text (snakeToTitle fieldName)
            , if isRequired then
                span [ class "required" ] [ text " *" ]

              else
                text ""
            ]
        , case maybeFk of
            Just fk ->
                -- Foreign key - check if we have options loaded
                let
                    maybeOptions =
                        Dict.get fk.references.table model.fkOptions
                in
                case maybeOptions of
                    Just options ->
                        -- Render as dropdown
                        div []
                            [ select
                                [ id fieldName
                                , onInput (UpdateFormField fieldName)
                                , required isRequired
                                , class "fk-select"
                                ]
                                (option [ value "", selected (currentValue == "") ] [ text ("-- Select " ++ snakeToTitle fk.references.table ++ " --") ]
                                    :: List.map
                                        (\opt ->
                                            option
                                                [ value opt.id
                                                , selected (currentValue == opt.id)
                                                ]
                                                [ text opt.label ]
                                        )
                                        options
                                )
                            , small [ class "fk-hint" ] [ text ("References: " ++ fk.references.table) ]
                            ]

                    Nothing ->
                        -- No options loaded yet - show text input as fallback
                        div []
                            [ input
                                [ type_ "text"
                                , id fieldName
                                , value currentValue
                                , onInput (UpdateFormField fieldName)
                                , required isRequired
                                , placeholder ("ID from " ++ fk.references.table)
                                ]
                                []
                            , small [ class "fk-hint" ] [ text ("References: " ++ fk.references.table) ]
                            ]

            Nothing ->
                -- Check if this is an enum-like union type
                if fieldSchema.isEnumLike && not (List.isEmpty fieldSchema.enumValues) then
                    -- Render as dropdown
                    select
                        [ id fieldName
                        , onInput (UpdateFormField fieldName)
                        , required isRequired
                        , class "enum-select"
                        ]
                        (option [ value "", selected (currentValue == "") ] [ text ("-- Select " ++ snakeToTitle fieldName ++ " --") ]
                            :: List.map
                                (\enumVal ->
                                    option
                                        [ value enumVal
                                        , selected (currentValue == enumVal)
                                        ]
                                        [ text enumVal ]
                                )
                                fieldSchema.enumValues
                        )

                else
                    viewInputByType inputType fieldName currentValue isRequired fieldSchema
        ]


viewInputByType : String -> String -> String -> Bool -> FieldSchema -> Html Msg
viewInputByType inputType fieldName currentValue isRequired fieldSchema =
    case inputType of
        "textarea" ->
            textarea
                [ id fieldName
                , value currentValue
                , onInput (UpdateFormField fieldName)
                , required isRequired
                , rows 4
                ]
                []

        "checkbox" ->
            input
                [ type_ "checkbox"
                , id fieldName
                , checked (currentValue == "true")
                , onCheck
                    (\b ->
                        UpdateFormField fieldName
                            (if b then
                                "true"

                             else
                                "false"
                            )
                    )
                ]
                []

        "number" ->
            input
                [ type_ "number"
                , id fieldName
                , value currentValue
                , onInput (UpdateFormField fieldName)
                , required isRequired
                ]
                []

        _ ->
            input
                [ type_ inputType
                , id fieldName
                , value currentValue
                , onInput (UpdateFormField fieldName)
                , required isRequired
                ]
                []


sqlTypeToInputType : FieldSchema -> String
sqlTypeToInputType fieldSchema =
    if String.contains "JSONB" fieldSchema.sqlType then
        "textarea"

    else if fieldSchema.sqlType == "BOOLEAN" then
        "checkbox"

    else if fieldSchema.sqlType == "INTEGER" || fieldSchema.sqlType == "BIGINT" then
        "number"

    else
        "text"



-- COLUMN WIDTH HELPERS


decodeColumnWidths : String -> Dict String Int
decodeColumnWidths json =
    case Decode.decodeString (Decode.dict Decode.int) json of
        Ok widths ->
            widths

        Err _ ->
            Dict.empty


encodeColumnWidths : Dict String Int -> String
encodeColumnWidths widths =
    Encode.dict identity Encode.int widths
        |> Encode.encode 0


saveColumnWidths : Dict String Int -> Cmd msg
saveColumnWidths widths =
    Prefs.save { columnWidthsJson = encodeColumnWidths widths }


getColumnWidth : String -> String -> Dict String Int -> Maybe Int
getColumnWidth tableName columnName widths =
    Dict.get (tableName ++ "." ++ columnName) widths



-- UTILITIES


snakeToTitle : String -> String
snakeToTitle str =
    str
        |> String.split "_"
        |> List.map capitalize
        |> String.join " "


capitalize : String -> String
capitalize str =
    case String.uncons str of
        Just ( first, rest ) ->
            String.cons (Char.toUpper first) rest

        Nothing ->
            str


truncate : Int -> String -> String
truncate maxLen str =
    if String.length str > maxLen then
        String.left maxLen str ++ "..."

    else
        str


truncateUrl : Int -> String -> String
truncateUrl maxLen url =
    -- Smart URL truncation: keep protocol + domain, truncate path
    let
        -- Remove protocol for display
        withoutProtocol =
            url
                |> String.replace "https://" ""
                |> String.replace "http://" ""

        -- Find first slash (end of domain)
        domainEnd =
            String.indexes "/" withoutProtocol
                |> List.head
                |> Maybe.withDefault (String.length withoutProtocol)

        domain =
            String.left domainEnd withoutProtocol

        pathPart =
            String.dropLeft domainEnd withoutProtocol
    in
    if String.length withoutProtocol <= maxLen then
        withoutProtocol

    else if String.length domain >= maxLen - 3 then
        -- Domain alone is too long
        String.left (maxLen - 3) domain ++ "..."

    else
        -- Show domain + truncated path
        domain ++ String.left (maxLen - String.length domain - 3) pathPart ++ "..."


formatTimestamp : String -> String
formatTimestamp ts =
    -- Just show raw for now - could convert from Unix ms
    ts


getFieldValue : String -> Encode.Value -> String
getFieldValue fieldName record =
    case Decode.decodeValue (Decode.field fieldName Decode.value) record of
        Ok val ->
            valueToString val

        Err _ ->
            ""


onSubmit : msg -> Attribute msg
onSubmit msg =
    Html.Events.preventDefaultOn "submit" (Decode.succeed ( msg, True ))


onMouseDownWithPosition : (Float -> msg) -> Attribute msg
onMouseDownWithPosition toMsg =
    Html.Events.custom "mousedown"
        (Decode.map
            (\x ->
                { message = toMsg x
                , stopPropagation = True
                , preventDefault = False
                }
            )
            (Decode.field "pageX" Decode.float)
        )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ adminApiResponse ApiResponseReceived
        , Prefs.onLoad PreferencesLoaded
        , Browser.Events.onMouseMove (Decode.map Resize (Decode.field "pageX" Decode.float))
        , Browser.Events.onMouseUp (Decode.succeed StopResize)
        ]



-- MAIN


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged
        , onUrlRequest = LinkClicked
        }
