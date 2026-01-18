port module Popup exposing (main)

import Api
import Api.Port
import Api.Schema
import Browser
import Html exposing (Html, button, div, h3, h4, p, text, input, textarea, img, label, select, option, span)
import Html.Attributes exposing (placeholder, value, style, src, type_, checked, name, selected, class)
import Html.Events exposing (onClick, onInput)
import Json.Encode as Encode
import Json.Decode as Decode


-- PORTS

port outbound : Encode.Value -> Cmd msg
port inbound : (Encode.Value -> msg) -> Sub msg

-- Host management ports
port saveHosts : Encode.Value -> Cmd msg
port loadHosts : () -> Cmd msg
port hostsLoaded : (Encode.Value -> msg) -> Sub msg
port openAdmin : Encode.Value -> Cmd msg


-- HOST CONFIG

type alias HostConfig =
    { name : String
    , url : String
    , adminToken : String
    }


encodeHosts : List HostConfig -> Encode.Value
encodeHosts hosts =
    Encode.list encodeHost hosts


encodeHost : HostConfig -> Encode.Value
encodeHost host =
    Encode.object
        [ ( "name", Encode.string host.name )
        , ( "url", Encode.string host.url )
        , ( "adminToken", Encode.string host.adminToken )
        ]


decodeHosts : Decode.Decoder (List HostConfig)
decodeHosts =
    Decode.list decodeHost


decodeHost : Decode.Decoder HostConfig
decodeHost =
    Decode.map3 HostConfig
        (Decode.field "name" Decode.string)
        (Decode.field "url" Decode.string)
        (Decode.oneOf
            [ Decode.field "adminToken" Decode.string
            , Decode.succeed ""
            ]
        )


defaultHosts : List HostConfig
defaultHosts =
    [ { name = "localhost", url = "http://localhost:3000/api", adminToken = "" }
    ]


{-| Extract hostname from URL for the host field in API requests
-}
hostFromUrl : String -> String
hostFromUrl url =
    -- Extract host from URL like "http://localhost:3000/api" -> "localhost"
    url
        |> String.replace "http://" ""
        |> String.replace "https://" ""
        |> String.split "/"
        |> List.head
        |> Maybe.withDefault "localhost"
        |> String.split ":"
        |> List.head
        |> Maybe.withDefault "localhost"


-- MODEL

type View
    = WriterView
    | SettingsView


type alias Flags =
    { title : String
    , url : String
    , selection : String
    , images : List String
    }


type alias Model =
    { portModel : Api.Port.Model Msg
    , status : String
    , title : String
    , url : String
    , selection : String
    , images : List String
    , selectedImage : Maybe String
    , comment : String
    , availableTags : List String
    , selectedTags : List String
    , newTagInput : String
    , hosts : List HostConfig
    , selectedHost : HostConfig
    , currentView : View
    , editingHost : Maybe HostConfig
    , hostForm : HostConfig
    , hostsLoaded : Bool
    }


emptyHostForm : HostConfig
emptyHostForm =
    { name = "", url = "", adminToken = "" }


init : Flags -> ( Model, Cmd Msg )
init flags =
    let
        initialPortModel = Api.Port.init

        initialHost =
            List.head defaultHosts
                |> Maybe.withDefault { name = "localhost", url = "http://localhost:3000/api", adminToken = "" }
    in
    ( { portModel = initialPortModel
      , status = "Loading hosts..."
      , title = flags.title
      , url = flags.url
      , selection = flags.selection
      , images = flags.images
      , selectedImage = List.head flags.images
      , comment = ""
      , availableTags = []
      , selectedTags = []
      , newTagInput = ""
      , hosts = []
      , selectedHost = initialHost
      , currentView = WriterView
      , editingHost = Nothing
      , hostForm = emptyHostForm
      , hostsLoaded = False
      }
    , loadHosts ()
    )


{-| Wrap the outbound port to include the target URL
-}
sendWithUrl : String -> Encode.Value -> Cmd msg
sendWithUrl targetUrl payload =
    let
        -- Add apiUrl to the payload
        wrapped =
            Encode.object
                [ ( "apiUrl", Encode.string targetUrl )
                , ( "payload", payload )
                ]
    in
    outbound wrapped


-- UPDATE

type Msg
    = PortMsg (Api.Port.Msg Msg)
    | SubmitItem
    | TitleChanged String
    | SelectionChanged String
    | ImageSelected String
    | CommentChanged String
    | GotSubmitRes (Result String Api.Schema.SubmitItemRes)
    | GotTags (Result String Api.Schema.GetTagsRes)
    | ToggleTag String
    | NewTagInput String
    | AddNewTag
    | HostSelected String
    | SwitchView View
    | HostsReceived Encode.Value
    | UpdateHostForm String String
    | SaveHost
    | EditHost HostConfig
    | DeleteHost String
    | CancelHostEdit
    | OpenAdminForHost HostConfig


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PortMsg pMsg ->
            let
                ( newPortModel, cmd ) =
                    Api.Port.update
                        { sendPort = sendWithUrl model.selectedHost.url }
                        pMsg
                        model.portModel
            in
            ( { model | portModel = newPortModel }
            , cmd
            )

        HostSelected hostName ->
            let
                newHost =
                    model.hosts
                        |> List.filter (\h -> h.name == hostName)
                        |> List.head
                        |> Maybe.withDefault model.selectedHost

                host = hostFromUrl newHost.url

                -- Reload tags for new host
                req = Api.getTags { host = host }
                portMsg = Api.Port.send GotTags req

                ( newPortModel, cmd ) =
                    Api.Port.update
                        { sendPort = sendWithUrl newHost.url }
                        portMsg
                        model.portModel
            in
            ( { model
              | selectedHost = newHost
              , portModel = newPortModel
              , availableTags = []
              , selectedTags = []
              }
            , cmd
            )

        SubmitItem ->
            if String.isEmpty model.title then
                ( { model | status = "Error: Title cannot be empty" }, Cmd.none )
            else if String.isEmpty model.url then
                ( { model | status = "Error: URL cannot be empty" }, Cmd.none )
            else if String.isEmpty model.selection then
                ( { model | status = "Error: Selection (Extract) cannot be empty" }, Cmd.none )
            else if model.selectedImage == Nothing then
                ( { model | status = "Error: Please select an image" }, Cmd.none )
            else if String.isEmpty model.comment then
                ( { model | status = "Error: Comment cannot be empty" }, Cmd.none )
            else
                let
                    host = hostFromUrl model.selectedHost.url

                    req =
                        Api.submitItem
                            { host = host
                            , title = model.title
                            , link = model.url
                            , image = Maybe.withDefault "" model.selectedImage
                            , extract = model.selection
                            , ownerComment = model.comment
                            , tags = model.selectedTags
                            }

                    portMsg = Api.Port.send GotSubmitRes req

                    ( newPortModel, cmd ) =
                        Api.Port.update
                            { sendPort = sendWithUrl model.selectedHost.url }
                            portMsg
                            model.portModel
                in
                ( { model | portModel = newPortModel, status = "Submitting..." }
                , cmd
                )

        TitleChanged val ->
            ( { model | title = val }, Cmd.none )

        SelectionChanged val ->
            ( { model | selection = val }, Cmd.none )

        ImageSelected val ->
            ( { model | selectedImage = Just val }, Cmd.none )

        CommentChanged val ->
            ( { model | comment = val }, Cmd.none )

        GotSubmitRes (Ok _) ->
            ( { model | status = "Success!" }, Cmd.none )

        GotSubmitRes (Err err) ->
            ( { model | status = "Error: " ++ err }, Cmd.none )

        GotTags (Ok res) ->
            ( { model | availableTags = res.tags }, Cmd.none )

        GotTags (Err _) ->
            ( model, Cmd.none )

        ToggleTag tag ->
            let
                newSelected =
                    if List.member tag model.selectedTags then
                        List.filter (\t -> t /= tag) model.selectedTags
                    else
                        tag :: model.selectedTags
            in
            ( { model | selectedTags = newSelected }, Cmd.none )

        NewTagInput val ->
            ( { model | newTagInput = val }, Cmd.none )

        AddNewTag ->
            let
                tag = String.trim model.newTagInput
            in
            if String.isEmpty tag then
                ( model, Cmd.none )
            else
                let
                    newSelected =
                        if List.member tag model.selectedTags then
                            model.selectedTags
                        else
                            tag :: model.selectedTags

                    newAvailable =
                        if List.member tag model.availableTags then
                            model.availableTags
                        else
                            List.sort (tag :: model.availableTags)
                in
                ( { model | selectedTags = newSelected, availableTags = newAvailable, newTagInput = "" }, Cmd.none )

        SwitchView newView ->
            ( { model | currentView = newView }, Cmd.none )

        HostsReceived json ->
            case Decode.decodeValue decodeHosts json of
                Ok hosts ->
                    let
                        actualHosts =
                            if List.isEmpty hosts then
                                defaultHosts
                            else
                                hosts

                        selectedHost =
                            List.head actualHosts
                                |> Maybe.withDefault model.selectedHost

                        host = hostFromUrl selectedHost.url
                        req = Api.getTags { host = host }
                        portMsg = Api.Port.send GotTags req

                        ( newPortModel, cmd ) =
                            Api.Port.update
                                { sendPort = sendWithUrl selectedHost.url }
                                portMsg
                                model.portModel
                    in
                    ( { model
                      | hosts = actualHosts
                      , selectedHost = selectedHost
                      , hostsLoaded = True
                      , status = "Ready"
                      , portModel = newPortModel
                      }
                    , cmd
                    )

                Err _ ->
                    ( { model
                      | hosts = defaultHosts
                      , selectedHost = List.head defaultHosts |> Maybe.withDefault model.selectedHost
                      , hostsLoaded = True
                      , status = "Ready"
                      }
                    , Cmd.none
                    )

        UpdateHostForm field val ->
            let
                hf = model.hostForm
                newHostForm =
                    case field of
                        "name" ->
                            { hf | name = val }
                        "url" ->
                            { hf | url = val }
                        "adminToken" ->
                            { hf | adminToken = val }
                        _ ->
                            hf
            in
            ( { model | hostForm = newHostForm }, Cmd.none )

        SaveHost ->
            let
                newHost = model.hostForm

                updatedHosts =
                    case model.editingHost of
                        Just editing ->
                            List.map
                                (\h ->
                                    if h.name == editing.name then
                                        newHost
                                    else
                                        h
                                )
                                model.hosts

                        Nothing ->
                            model.hosts ++ [ newHost ]

                selectedHost =
                    if model.selectedHost.name == (model.editingHost |> Maybe.map .name |> Maybe.withDefault "") then
                        newHost
                    else
                        model.selectedHost
            in
            ( { model
              | hosts = updatedHosts
              , hostForm = emptyHostForm
              , editingHost = Nothing
              , selectedHost = selectedHost
              }
            , saveHosts (encodeHosts updatedHosts)
            )

        EditHost hostConfig ->
            ( { model
              | editingHost = Just hostConfig
              , hostForm = hostConfig
              }
            , Cmd.none
            )

        DeleteHost hostName ->
            let
                updatedHosts =
                    List.filter (\h -> h.name /= hostName) model.hosts

                -- If we deleted the selected host, select the first remaining one
                selectedHost =
                    if model.selectedHost.name == hostName then
                        List.head updatedHosts
                            |> Maybe.withDefault model.selectedHost
                    else
                        model.selectedHost
            in
            ( { model | hosts = updatedHosts, selectedHost = selectedHost }
            , saveHosts (encodeHosts updatedHosts)
            )

        CancelHostEdit ->
            ( { model
              | editingHost = Nothing
              , hostForm = emptyHostForm
              }
            , Cmd.none
            )

        OpenAdminForHost hostConfig ->
            ( model
            , openAdmin
                (Encode.object
                    [ ( "url", Encode.string hostConfig.url )
                    , ( "adminToken", Encode.string hostConfig.adminToken )
                    ]
                )
            )


-- VIEW

view : Model -> Html Msg
view model =
    div [ style "width" "100%", style "padding" "15px", style "font-family" "sans-serif", style "min-width" "350px" ]
        [ viewTabs model
        , case model.currentView of
            WriterView ->
                viewWriter model

            SettingsView ->
                viewSettings model
        ]


viewTabs : Model -> Html Msg
viewTabs model =
    div [ style "display" "flex", style "border-bottom" "1px solid #ddd", style "margin-bottom" "15px" ]
        [ viewTab "Writer" WriterView model.currentView
        , viewTab "Hosts" SettingsView model.currentView
        ]


viewTab : String -> View -> View -> Html Msg
viewTab label targetView currentView =
    let
        isActive = targetView == currentView
        baseStyle =
            [ style "padding" "8px 16px"
            , style "cursor" "pointer"
            , style "border" "none"
            , style "background" "transparent"
            , style "font-size" "14px"
            ]
        activeStyle =
            if isActive then
                [ style "border-bottom" "2px solid #007bff"
                , style "color" "#007bff"
                , style "font-weight" "bold"
                ]
            else
                [ style "color" "#666" ]
    in
    button (baseStyle ++ activeStyle ++ [ onClick (SwitchView targetView) ])
        [ text label ]


viewWriter : Model -> Html Msg
viewWriter model =
    div []
        [ h3 [ style "margin-top" "0" ] [ text "Horatio Writer" ]

        -- Host Selector
        , div [ style "margin-bottom" "10px" ]
            [ label [ style "display" "block", style "font-weight" "bold" ] [ text "Post to" ]
            , select
                [ onInput HostSelected
                , style "width" "100%"
                , style "padding" "5px"
                ]
                (List.map (viewHostOption model.selectedHost) model.hosts)
            ]

        , div [ style "margin-bottom" "10px" ]
            [ label [ style "display" "block", style "font-weight" "bold" ] [ text "Title" ]
            , input
                [ value model.title
                , onInput TitleChanged
                , style "width" "100%"
                , style "padding" "5px"
                ] []
            ]

        , div [ style "margin-bottom" "10px" ]
            [ label [ style "display" "block", style "font-weight" "bold" ] [ text "URL" ]
            , div [ style "padding" "5px", style "background" "#f0f0f0", style "word-break" "break-all", style "font-size" "0.9em" ]
                [ text model.url ]
            ]

        , div [ style "margin-bottom" "10px" ]
            [ label [ style "display" "block", style "font-weight" "bold" ] [ text "Selection (Extract)" ]
            , textarea
                [ value model.selection
                , onInput SelectionChanged
                , style "width" "100%"
                , style "height" "80px"
                , style "padding" "5px"
                ] []
            ]

        , div [ style "margin-bottom" "10px" ]
            [ label [ style "display" "block", style "font-weight" "bold" ] [ text "Comment" ]
            , textarea
                [ value model.comment
                , onInput CommentChanged
                , placeholder "Add your thoughts..."
                , style "width" "100%"
                , style "height" "60px"
                , style "padding" "5px"
                ] []
            ]

        , div [ style "margin-bottom" "10px" ]
            [ label [ style "display" "block", style "font-weight" "bold" ] [ text "Tags" ]

            , div [ style "display" "flex", style "flex-wrap" "wrap", style "gap" "5px", style "margin-bottom" "5px" ]
                (List.map (viewTagChip model.selectedTags) model.selectedTags)

            , div [ style "display" "flex", style "gap" "5px", style "margin-bottom" "5px" ]
                [ input
                    [ value model.newTagInput
                    , onInput NewTagInput
                    , placeholder "New tag..."
                    , style "flex-grow" "1"
                    , style "padding" "5px"
                    ] []
                , button
                    [ onClick AddNewTag
                    , style "padding" "5px 10px"
                    , style "cursor" "pointer"
                    ] [ text "Add" ]
                ]

            , if List.isEmpty model.availableTags then
                text ""
              else
                div [ style "display" "flex", style "flex-wrap" "wrap", style "gap" "5px" ]
                    (List.map (viewAvailableTag model.selectedTags) (List.filter (\t -> not (List.member t model.selectedTags)) model.availableTags))
            ]

        , if List.isEmpty model.images then
            div [ style "margin-bottom" "10px", style "color" "red" ] [ text "No images found on page" ]
          else
            div [ style "margin-bottom" "10px" ]
                [ label [ style "display" "block", style "font-weight" "bold" ] [ text "Select Image" ]
                , div [ style "display" "flex", style "overflow-x" "auto", style "gap" "10px", style "padding" "5px 0" ]
                    (List.map (viewImage model.selectedImage) model.images)
                ]

        , button
            [ onClick SubmitItem
            , style "width" "100%"
            , style "padding" "10px"
            , style "background-color" "#007bff"
            , style "color" "white"
            , style "border" "none"
            , style "cursor" "pointer"
            , style "font-size" "16px"
            ] [ text "Submit" ]

        , div [ style "margin-top" "10px", style "color" (if String.startsWith "Error" model.status then "red" else "green") ]
            [ text model.status ]
        ]


viewSettings : Model -> Html Msg
viewSettings model =
    div []
        [ h3 [ style "margin-top" "0" ] [ text "Configured Hosts" ]
        , p [ style "color" "#666", style "font-size" "0.9em", style "margin-bottom" "15px" ]
            [ text "Manage your Horatio servers. Admin tokens are sent as headers for secure admin access." ]

        -- Host form
        , div [ style "background" "#f5f5f5", style "padding" "15px", style "border-radius" "4px", style "margin-bottom" "15px" ]
            [ h4 [ style "margin-top" "0", style "margin-bottom" "10px" ]
                [ text (if model.editingHost /= Nothing then "Edit Host" else "Add New Host") ]
            , div [ style "margin-bottom" "10px" ]
                [ label [ style "display" "block", style "font-weight" "bold", style "margin-bottom" "3px" ] [ text "Name" ]
                , input
                    [ value model.hostForm.name
                    , onInput (UpdateHostForm "name")
                    , placeholder "My Server"
                    , style "width" "100%"
                    , style "padding" "5px"
                    , style "box-sizing" "border-box"
                    ] []
                ]
            , div [ style "margin-bottom" "10px" ]
                [ label [ style "display" "block", style "font-weight" "bold", style "margin-bottom" "3px" ] [ text "API URL" ]
                , input
                    [ value model.hostForm.url
                    , onInput (UpdateHostForm "url")
                    , placeholder "http://localhost:3000/api"
                    , style "width" "100%"
                    , style "padding" "5px"
                    , style "box-sizing" "border-box"
                    ] []
                ]
            , div [ style "margin-bottom" "10px" ]
                [ label [ style "display" "block", style "font-weight" "bold", style "margin-bottom" "3px" ] [ text "Admin Token (optional)" ]
                , input
                    [ type_ "password"
                    , value model.hostForm.adminToken
                    , onInput (UpdateHostForm "adminToken")
                    , placeholder "For admin UI access"
                    , style "width" "100%"
                    , style "padding" "5px"
                    , style "box-sizing" "border-box"
                    ] []
                ]
            , div [ style "display" "flex", style "gap" "10px" ]
                [ button
                    [ onClick SaveHost
                    , style "padding" "8px 16px"
                    , style "background-color" "#007bff"
                    , style "color" "white"
                    , style "border" "none"
                    , style "cursor" "pointer"
                    , style "border-radius" "4px"
                    ]
                    [ text (if model.editingHost /= Nothing then "Update" else "Add Host") ]
                , if model.editingHost /= Nothing then
                    button
                        [ onClick CancelHostEdit
                        , style "padding" "8px 16px"
                        , style "background-color" "#6c757d"
                        , style "color" "white"
                        , style "border" "none"
                        , style "cursor" "pointer"
                        , style "border-radius" "4px"
                        ]
                        [ text "Cancel" ]
                  else
                    text ""
                ]
            ]

        -- Host list
        , if List.isEmpty model.hosts then
            div [ style "color" "#666", style "font-style" "italic" ]
                [ text "No hosts configured. Add one above." ]
          else
            div []
                (List.map (viewHostRow model.selectedHost) model.hosts)
        ]


viewHostRow : HostConfig -> HostConfig -> Html Msg
viewHostRow selectedHost host =
    let
        isSelected = host.name == selectedHost.name
        hasAdminToken = not (String.isEmpty host.adminToken)
    in
    div
        [ style "display" "flex"
        , style "align-items" "center"
        , style "padding" "10px"
        , style "border" (if isSelected then "2px solid #007bff" else "1px solid #ddd")
        , style "border-radius" "4px"
        , style "margin-bottom" "8px"
        , style "background" (if isSelected then "#f0f7ff" else "white")
        ]
        [ div [ style "flex-grow" "1" ]
            [ div [ style "font-weight" "bold" ] [ text host.name ]
            , div [ style "font-size" "0.85em", style "color" "#666" ] [ text host.url ]
            , if hasAdminToken then
                div [ style "font-size" "0.8em", style "color" "#28a745", style "margin-top" "2px" ]
                    [ text "Admin access configured" ]
              else
                text ""
            ]
        , div [ style "display" "flex", style "gap" "5px", style "flex-shrink" "0" ]
            [ if hasAdminToken then
                button
                    [ onClick (OpenAdminForHost host)
                    , style "padding" "4px 8px"
                    , style "background-color" "#28a745"
                    , style "color" "white"
                    , style "border" "none"
                    , style "cursor" "pointer"
                    , style "border-radius" "3px"
                    , style "font-size" "0.85em"
                    ]
                    [ text "Admin" ]
              else
                text ""
            , button
                [ onClick (EditHost host)
                , style "padding" "4px 8px"
                , style "background-color" "#6c757d"
                , style "color" "white"
                , style "border" "none"
                , style "cursor" "pointer"
                , style "border-radius" "3px"
                , style "font-size" "0.85em"
                ]
                [ text "Edit" ]
            , button
                [ onClick (DeleteHost host.name)
                , style "padding" "4px 8px"
                , style "background-color" "#dc3545"
                , style "color" "white"
                , style "border" "none"
                , style "cursor" "pointer"
                , style "border-radius" "3px"
                , style "font-size" "0.85em"
                ]
                [ text "Delete" ]
            ]
        ]


viewHostOption : HostConfig -> HostConfig -> Html Msg
viewHostOption selectedHost host =
    option
        [ value host.name
        , selected (host.name == selectedHost.name)
        ]
        [ text host.name ]


viewImage : Maybe String -> String -> Html Msg
viewImage selectedImage imageUrl =
    let
        isSelected = selectedImage == Just imageUrl
        borderStyle = if isSelected then "3px solid #007bff" else "1px solid #ddd"
    in
    img
        [ src imageUrl
        , onClick (ImageSelected imageUrl)
        , style "height" "80px"
        , style "cursor" "pointer"
        , style "border" borderStyle
        ] []


viewTagChip : List String -> String -> Html Msg
viewTagChip _ tag =
    div
        [ onClick (ToggleTag tag)
        , style "background-color" "#007bff"
        , style "color" "white"
        , style "padding" "2px 8px"
        , style "border-radius" "12px"
        , style "font-size" "0.85em"
        , style "cursor" "pointer"
        , style "display" "flex"
        , style "align-items" "center"
        ]
        [ text tag
        , text " ×"
        ]


viewAvailableTag : List String -> String -> Html Msg
viewAvailableTag _ tag =
    div
        [ onClick (ToggleTag tag)
        , style "background-color" "#e0e0e0"
        , style "color" "#333"
        , style "padding" "2px 8px"
        , style "border-radius" "12px"
        , style "font-size" "0.85em"
        , style "cursor" "pointer"
        ]
        [ text tag ]


-- MAIN

main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.batch
        [ Api.Port.subscriptions inbound PortMsg
        , hostsLoaded HostsReceived
        ]
