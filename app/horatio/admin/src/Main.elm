port module Main exposing (main)

{-| Horatio Admin Interface

Auto-generated admin interface for all database models.
Provides CFUK operations (Create, Find, Update, Kill) for each resource.

Built on the "Rust once, UI never" principle - UI is generated from Rust models.
-}

import Browser
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http
import Json.Decode as Decode
import Json.Encode as Encode
import Url
import Url.Parser as Parser exposing (Parser, (</>))
import Generated.Resources as Resources


-- PORTS

port adminApiRequest : AdminApiRequest -> Cmd msg
port adminApiResponse : (AdminApiResponse -> msg) -> Sub msg
port setAdminToken : String -> Cmd msg


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


-- MODEL

type alias Model =
    { key : Nav.Key
    , url : Url.Url
    , route : Route
    , adminToken : String
    , baseUrl : String
    , basePath : String
    , currentResource : Maybe Resources.Resource
    , currentResourceId : Maybe String
    , resources : List Encode.Value
    , formModel : Maybe Resources.FormModel
    , loading : Bool
    , error : Maybe String
    , apiCorrelationCounter : Int
    }

type Route
    = Home
    | ResourceList Resources.Resource
    | ResourceEdit Resources.Resource String
    | ResourceCreate Resources.Resource
    | NotFound


-- INIT

init : Flags -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url key =
    let
        route = parseRoute url
        
        model =
            { key = key
            , url = url
            , route = route
            , adminToken = flags.adminToken
            , baseUrl = flags.baseUrl
            , basePath = flags.basePath
            , currentResource = Nothing
            , currentResourceId = Nothing
            , resources = []
            , formModel = Nothing
            , loading = False
            , error = Nothing
            , apiCorrelationCounter = 0
            }
    in
    ( model, loadRouteData model route )


-- ROUTING

routeParser : Parser (Route -> a) a
routeParser =
    Parser.oneOf
        [ Parser.map Home Parser.top
        , Parser.map (\res -> ResourceList res) (Parser.s "resource" </> resourceParser)
        , Parser.map (\res -> ResourceCreate res) (Parser.s "resource" </> resourceParser </> Parser.s "new")
        , Parser.map (\res id -> ResourceEdit res id) (Parser.s "resource" </> resourceParser </> Parser.string)
        ]

resourceParser : Parser (Resources.Resource -> a) a
resourceParser =
    Parser.custom "RESOURCE" Resources.resourceFromString

parseRoute : Url.Url -> Route
parseRoute url =
    let
        -- Remove /admin/ui prefix to get the route relative to the app
        cleanPath = 
            if String.startsWith "/admin/ui" url.path then
                String.dropLeft 9 url.path  -- Remove "/admin/ui" (9 characters)
            else
                url.path
        
        -- Create a modified URL with the clean path for parsing
        modifiedUrl = { url | path = cleanPath }
    in
    Maybe.withDefault NotFound (Parser.parse routeParser modifiedUrl)

routeToString : String -> Route -> String
routeToString basePath route =
    let
        prefix = if String.endsWith "/" basePath then 
                   String.dropRight 1 basePath 
                 else 
                   basePath
    in
    case route of
        Home -> prefix ++ "/"
        ResourceList resource -> prefix ++ "/resource/" ++ Resources.resourceToString resource
        ResourceEdit resource id -> prefix ++ "/resource/" ++ Resources.resourceToString resource ++ "/" ++ id
        ResourceCreate resource -> prefix ++ "/resource/" ++ Resources.resourceToString resource ++ "/new"
        NotFound -> prefix ++ "/not-found"

loadRouteData : Model -> Route -> Cmd Msg
loadRouteData model route =
    case route of
        ResourceList resource ->
            loadResourceList model resource
        
        ResourceEdit resource id ->
            loadResourceById model resource id
        
        ResourceCreate resource ->
            Cmd.none
        
        _ ->
            Cmd.none


-- UPDATE

type Msg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | LoadResourceList Resources.Resource
    | LoadResourceById Resources.Resource String
    | CreateResource Resources.Resource
    | EditResource Resources.Resource String
    | UpdateFormModel Resources.FormModel
    | SubmitForm
    | CancelForm
    | DeleteResource Resources.Resource String
    | AdminApiResponseReceived AdminApiResponse
    | SetError String
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
                route = parseRoute url
            in
            ( { model | url = url, route = route, error = Nothing }
            , loadRouteData model route
            )

        LoadResourceList resource ->
            ( { model | loading = True, currentResource = Just resource }
            , Nav.pushUrl model.key (routeToString model.basePath (ResourceList resource))
            )

        LoadResourceById resource id ->
            ( { model | loading = True, currentResource = Just resource }
            , loadResourceById model resource id
            )

        CreateResource resource ->
            ( { model | currentResource = Just resource, currentResourceId = Nothing, formModel = Just (Resources.initFormModel resource) }
            , Nav.pushUrl model.key (routeToString model.basePath (ResourceCreate resource))
            )

        EditResource resource id ->
            ( { model | loading = True, currentResource = Just resource, currentResourceId = Just id }
            , Nav.pushUrl model.key (routeToString model.basePath (ResourceEdit resource id))
            )

        UpdateFormModel formModel ->
            ( { model | formModel = Just formModel }, Cmd.none )

        SubmitForm ->
            case model.formModel of
                Just formModel ->
                    ( { model | loading = True }, submitForm model formModel )
                
                Nothing ->
                    ( model, Cmd.none )

        CancelForm ->
            case model.currentResource of
                Just resource ->
                    ( { model | formModel = Nothing, currentResourceId = Nothing }
                    , Nav.pushUrl model.key (routeToString model.basePath (ResourceList resource))
                    )
                
                Nothing ->
                    ( { model | formModel = Nothing, currentResourceId = Nothing }
                    , Nav.pushUrl model.key (routeToString model.basePath Home)
                    )

        DeleteResource resource id ->
            ( { model | loading = True }
            , deleteResource model resource id
            )

        AdminApiResponseReceived response ->
            handleApiResponse model response

        SetError errorMsg ->
            ( { model | error = Just errorMsg, loading = False }, Cmd.none )

        ClearError ->
            ( { model | error = Nothing }, Cmd.none )

handleApiResponse : Model -> AdminApiResponse -> ( Model, Cmd Msg )
handleApiResponse model response =
    if response.success then
        case response.data of
            Just data ->
                -- Try to decode as array first (for list endpoints)
                case Decode.decodeValue (Decode.list Decode.value) data of
                    Ok resourceList ->
                        ( { model | loading = False, resources = resourceList, error = Nothing }, Cmd.none )
                    
                    Err _ ->
                        -- If array decode fails, try single object (for individual resource)
                        case Decode.decodeValue Decode.value data of
                            Ok resource ->
                                -- Single resource response - could be form load or form submit success
                                case (model.currentResource, model.route) of
                                    (Just currentRes, ResourceEdit _ _) ->
                                        -- Loading existing resource for editing
                                        let
                                            formModel = populateFormFromResource currentRes resource
                                        in
                                        ( { model | loading = False, formModel = Just formModel, error = Nothing }, Cmd.none )
                                    
                                    (Just currentRes, ResourceCreate _) ->
                                        -- Successful create - navigate back to list
                                        ( { model | loading = False, formModel = Nothing, currentResourceId = Nothing, error = Nothing }
                                        , Nav.pushUrl model.key (routeToString model.basePath (ResourceList currentRes))
                                        )
                                    
                                    (Just currentRes, _) ->
                                        -- Successful update - navigate back to list  
                                        ( { model | loading = False, formModel = Nothing, currentResourceId = Nothing, error = Nothing }
                                        , Nav.pushUrl model.key (routeToString model.basePath (ResourceList currentRes))
                                        )
                                    
                                    (Nothing, _) ->
                                        ( { model | loading = False, resources = [resource], error = Nothing }, Cmd.none )
                            
                            Err decodeError ->
                                ( { model | loading = False, resources = [], error = Just ("Data decode error: " ++ Decode.errorToString decodeError) }, Cmd.none )
            
            Nothing ->
                ( { model | loading = False, resources = [], error = Nothing }, Cmd.none )
    else
        let
            errorMsg = response.error |> Maybe.withDefault "Unknown API error"
        in
        ( { model | error = Just errorMsg, loading = False }, Cmd.none )

populateFormFromResource : Resources.Resource -> Encode.Value -> Resources.FormModel
populateFormFromResource resource resourceData =
    let
        baseForm = Resources.initFormModel resource
        
        populateField field =
            let
                fieldValue = case Decode.decodeValue (Decode.field field.name Decode.string) resourceData of
                    Ok val -> val
                    Err _ -> field.value
            in
            { field | value = fieldValue }
        
        populatedFields = List.map populateField baseForm.fields
    in
    { baseForm | fields = populatedFields }


-- API FUNCTIONS

loadResourceList : Model -> Resources.Resource -> Cmd Msg
loadResourceList model resource =
    let
        correlationId = String.fromInt model.apiCorrelationCounter
        endpoint = Resources.resourceToString resource
    in
    adminApiRequest
        { method = "GET"
        , endpoint = endpoint
        , body = Nothing
        , correlationId = correlationId
        }

loadResourceById : Model -> Resources.Resource -> String -> Cmd Msg
loadResourceById model resource id =
    let
        correlationId = String.fromInt (model.apiCorrelationCounter + 1)
        endpoint = Resources.resourceToString resource ++ "/" ++ id
    in
    adminApiRequest
        { method = "GET"
        , endpoint = endpoint
        , body = Nothing
        , correlationId = correlationId
        }

submitForm : Model -> Resources.FormModel -> Cmd Msg
submitForm model formModel =
    let
        correlationId = String.fromInt (model.apiCorrelationCounter + 2)
        resourceName = Resources.resourceToString formModel.resource
        
        -- Convert form fields to JSON
        body = Encode.object
            (List.map (\field -> ( field.name, Encode.string field.value )) formModel.fields)
        
        -- Determine if this is create or update based on currentResourceId
        (method, endpoint) = case model.currentResourceId of
            Just id ->
                -- Update existing resource
                ("PUT", resourceName ++ "/" ++ id)
            
            Nothing ->
                -- Create new resource
                ("POST", resourceName)
    in
    adminApiRequest
        { method = method
        , endpoint = endpoint
        , body = Just body
        , correlationId = correlationId
        }

deleteResource : Model -> Resources.Resource -> String -> Cmd Msg
deleteResource model resource id =
    let
        correlationId = String.fromInt (model.apiCorrelationCounter + 3)
        endpoint = Resources.resourceToString resource ++ "/" ++ id
    in
    adminApiRequest
        { method = "DELETE"
        , endpoint = endpoint
        , body = Nothing
        , correlationId = correlationId
        }


-- VIEW

view : Model -> Browser.Document Msg
view model =
    { title = "Horatio Admin"
    , body =
        [ viewHeader model
        , viewNavigation model
        , viewContent model
        ]
    }

viewHeader : Model -> Html Msg
viewHeader model =
    div [ class "admin-header" ]
        [ h1 [] [ text "Horatio Admin" ]
        , p [] [ text "Auto-generated admin interface for database models" ]
        ]

viewNavigation : Model -> Html Msg
viewNavigation model =
    div [ class "admin-nav" ]
        (List.map (viewResourceLink model) Resources.allResources)

viewResourceLink : Model -> Resources.Resource -> Html Msg
viewResourceLink model resource =
    let
        isActive = model.currentResource == Just resource
        url = routeToString model.basePath (ResourceList resource)
        clickHandler = onClickPreventDefault (LoadResourceList resource)
    in
    a [ href url
      , classList [ ( "active", isActive ) ]
      , clickHandler
      ] 
      [ text (Resources.resourceToString resource) ]

onClickPreventDefault : Msg -> Attribute Msg
onClickPreventDefault msg =
    Html.Events.preventDefaultOn "click" 
        (Decode.succeed (msg, True))

viewContent : Model -> Html Msg
viewContent model =
    div [ class "admin-content" ]
        [ viewError model.error
        , viewLoading model.loading
        , viewRoute model
        ]

viewError : Maybe String -> Html Msg
viewError maybeError =
    case maybeError of
        Nothing ->
            text ""
        
        Just errorMsg ->
            div [ class "form-errors" ]
                [ div [ class "error" ] [ text errorMsg ]
                , button [ onClick ClearError ] [ text "✕" ]
                ]

viewLoading : Bool -> Html Msg
viewLoading loading =
    if loading then
        div [] [ text "Loading..." ]
    else
        text ""

viewRoute : Model -> Html Msg
viewRoute model =
    case model.route of
        Home ->
            viewHome model
        
        ResourceList resource ->
            viewResourceList model resource
        
        ResourceEdit resource id ->
            viewResourceEdit model resource id
        
        ResourceCreate resource ->
            viewResourceCreate model resource
        
        NotFound ->
            div [] [ h2 [] [ text "Page Not Found" ] ]

viewHome : Model -> Html Msg
viewHome model =
    div []
        [ h2 [] [ text "Welcome to Horatio Admin" ]
        , p [] [ text "Select a resource from the navigation to manage your data." ]
        , div []
            [ h3 [] [ text "Available Resources:" ]
            , ul []
                (List.map (\resource ->
                    li []
                        [ a [ href (routeToString model.basePath (ResourceList resource))
                            , onClickPreventDefault (LoadResourceList resource)
                            ]
                            [ text (Resources.resourceToString resource) ]
                        ]
                ) Resources.allResources)
            ]
        ]

viewResourceList : Model -> Resources.Resource -> Html Msg
viewResourceList model resource =
    div []
        [ div [ style "display" "flex", style "justify-content" "space-between", style "align-items" "center", style "margin-bottom" "1rem" ]
            [ h2 [] [ text (Resources.resourceToString resource ++ " List") ]
            , button 
                [ class "btn btn-primary"
                , onClick (CreateResource resource)
                ] 
                [ text ("New " ++ Resources.resourceToString resource) ]
            ]
        , Resources.viewTable
            { resource = resource
            , sortField = "created_at"
            , sortDirection = "desc"
            , currentPage = 1
            , itemsPerPage = 20
            }
            model.resources
            (\id -> EditResource resource id)
            (\id -> DeleteResource resource id)
        ]

viewResourceEdit : Model -> Resources.Resource -> String -> Html Msg
viewResourceEdit model resource id =
    div []
        [ h2 [] [ text ("Edit " ++ Resources.resourceToString resource) ]
        , case model.formModel of
            Just formModel ->
                Resources.viewForm formModel UpdateFormModel (\_ -> SubmitForm) CancelForm
            
            Nothing ->
                text "Loading form..."
        ]

viewResourceCreate : Model -> Resources.Resource -> Html Msg
viewResourceCreate model resource =
    div []
        [ h2 [] [ text ("Create " ++ Resources.resourceToString resource) ]
        , case model.formModel of
            Just formModel ->
                Resources.viewForm formModel UpdateFormModel (\_ -> SubmitForm) CancelForm
            
            Nothing ->
                text "Initializing form..."
        ]


-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ adminApiResponse AdminApiResponseReceived
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