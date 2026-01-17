port module Main exposing (main)

{-| Schema-Driven Admin Interface

A generic admin shell that reads schema.json at runtime and dynamically
renders tables and forms. No code generation needed when models change.

"Rust once, UI never" - the UI adapts to schema changes automatically.
-}

import Browser
import Browser.Navigation as Nav
import Dict exposing (Dict)
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Url
import Url.Parser as Parser exposing ((</>), Parser)



-- PORTS


port adminApiRequest : AdminApiRequest -> Cmd msg


port adminApiResponse : (AdminApiResponse -> msg) -> Sub msg



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
    }


type alias TableSchema =
    { structName : String
    , tableName : String
    , sourceFile : String
    , fields : Dict String FieldSchema
    , primaryKey : Maybe String
    , foreignKeys : List ForeignKey
    , referencedBy : List Reference
    }


type alias FieldSchema =
    { rustType : String
    , sqlType : String
    , nullable : Bool
    , isPrimaryKey : Bool
    , isTimestamp : Bool
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
    , loading : Bool
    , error : Maybe String
    , correlationCounter : Int
    }


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
            , loading = True
            , error = Nothing
            , correlationCounter = 0
            }
    in
    ( model, fetchSchema model )


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
    | SubmitForm
    | CancelForm
    | DeleteRecord String String
    | ClearError


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
            in
            ( { model | url = url, route = route, error = Nothing }
            , loadRouteData model route
            )

        ApiResponseReceived response ->
            handleApiResponse model response

        NavigateToTable tableName ->
            ( { model | loading = True, currentTable = Just tableName }
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
              }
            , Nav.pushUrl model.key (routeToPath model.basePath (RecordEdit tableName recordId))
            )

        UpdateFormField fieldName value ->
            ( { model | formData = Dict.insert fieldName value model.formData }
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


loadRouteData : Model -> Route -> Cmd Msg
loadRouteData model route =
    case route of
        TableList tableName ->
            loadRecords model tableName

        RecordEdit tableName recordId ->
            loadRecord model tableName recordId

        _ ->
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

    else if response.success then
        case response.data of
            Just data ->
                -- Try array (list response)
                case Decode.decodeValue (Decode.list Decode.value) data of
                    Ok recordList ->
                        ( { model | loading = False, records = recordList, error = Nothing }
                        , Cmd.none
                        )

                    Err _ ->
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
    adminApiRequest
        { method = "GET"
        , endpoint = tableName
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
    in
    adminApiRequest
        { method = method
        , endpoint = endpoint
        , body = Just body
        , correlationId = "submit-" ++ tableName
        }


deleteRecord : Model -> String -> String -> Cmd Msg
deleteRecord model tableName recordId =
    adminApiRequest
        { method = "DELETE"
        , endpoint = tableName ++ "/" ++ recordId
        , body = Nothing
        , correlationId = "delete-" ++ tableName ++ "-" ++ recordId
        }



-- SCHEMA DECODER


schemaDecoder : Decoder Schema
schemaDecoder =
    Decode.map2 Schema
        (Decode.field "tables" (Decode.dict tableSchemaDecoder))
        (Decode.field "relationships" (Decode.list relationshipDecoder))


tableSchemaDecoder : Decoder TableSchema
tableSchemaDecoder =
    Decode.map7 TableSchema
        (Decode.field "structName" Decode.string)
        (Decode.field "tableName" Decode.string)
        (Decode.field "sourceFile" Decode.string)
        (Decode.field "fields" (Decode.dict fieldSchemaDecoder))
        (Decode.field "primaryKey" (Decode.nullable Decode.string))
        (Decode.field "foreignKeys" (Decode.list foreignKeyDecoder))
        (Decode.field "referencedBy" (Decode.list referenceDecoder))


fieldSchemaDecoder : Decoder FieldSchema
fieldSchemaDecoder =
    Decode.map5 FieldSchema
        (Decode.field "rustType" Decode.string)
        (Decode.field "sqlType" Decode.string)
        (Decode.field "nullable" Decode.bool)
        (Decode.field "isPrimaryKey" Decode.bool)
        (Decode.field "isTimestamp" Decode.bool)


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



-- VIEW


view : Model -> Browser.Document Msg
view model =
    { title = "Admin"
    , body =
        [ div [ class "admin-layout" ]
            [ viewSidebar model
            , div [ class "admin-main" ]
                [ viewError model.error
                , viewContent model
                ]
            ]
        ]
    }


viewSidebar : Model -> Html Msg
viewSidebar model =
    div [ class "admin-sidebar" ]
        [ h2 [] [ text "Tables" ]
        , case model.schema of
            Just schema ->
                ul [ class "table-list" ]
                    (Dict.toList schema.tables
                        |> List.sortBy Tuple.first
                        |> List.map (viewTableLink model)
                    )

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
                div []
                    [ h3 [] [ text "Available Tables" ]
                    , ul []
                        (Dict.toList schema.tables
                            |> List.map
                                (\( name, tbl ) ->
                                    li []
                                        [ a [ href "#", onClick (NavigateToTable name) ]
                                            [ text (tbl.structName ++ " (" ++ String.fromInt (Dict.size tbl.fields) ++ " fields)") ]
                                        ]
                                )
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
        fieldNames =
            Dict.keys tableSchema.fields
                |> List.sortBy
                    (\name ->
                        if name == "id" then
                            "0"

                        else if name == "created_at" then
                            "zzz"

                        else
                            name
                    )
    in
    table [ class "data-table" ]
        [ thead []
            [ tr []
                (List.map (\name -> th [] [ text (snakeToTitle name) ]) fieldNames
                    ++ [ th [] [ text "Actions" ] ]
                )
            ]
        , tbody []
            (List.map (viewDataRow model tableName fieldNames tableSchema) model.records)
        ]


viewDataRow : Model -> String -> List String -> TableSchema -> Encode.Value -> Html Msg
viewDataRow model tableName fieldNames tableSchema record =
    let
        recordId =
            getFieldValue "id" record
    in
    tr []
        (List.map
            (\fieldName ->
                let
                    value =
                        getFieldValue fieldName record

                    fieldSchema =
                        Dict.get fieldName tableSchema.fields
                in
                td []
                    [ case fieldSchema of
                        Just fs ->
                            viewFieldValue fs fieldName value tableSchema

                        Nothing ->
                            text value
                    ]
            )
            fieldNames
            ++ [ td [ class "actions" ]
                    [ button
                        [ class "btn btn-sm"
                        , onClick (NavigateToEdit tableName recordId)
                        ]
                        [ text "Edit" ]
                    , button
                        [ class "btn btn-sm btn-danger"
                        , onClick (DeleteRecord tableName recordId)
                        ]
                        [ text "Delete" ]
                    ]
               ]
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

                        editableFields =
                            Dict.toList tableSchema.fields
                                |> List.filter (\( name, fs ) -> not fs.isPrimaryKey && not fs.isTimestamp)
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
                                    ]
                                ]
                        ]

                Nothing ->
                    div [] [ text ("Unknown table: " ++ tableName) ]

        Nothing ->
            div [] [ text "Schema not loaded" ]


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
                -- Foreign key - show as text input with hint
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



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    adminApiResponse ApiResponseReceived



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
