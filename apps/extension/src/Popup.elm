port module Popup exposing (main)

import Api
import Api.Port
import Api.Schema
import Browser
import Html exposing (Html, button, div, h3, h4, text, input, textarea, img, label)
import Html.Attributes exposing (placeholder, value, style, src, type_, checked, name)
import Html.Events exposing (onClick, onInput)
import Json.Encode as Encode

-- PORTS

port outbound : Encode.Value -> Cmd msg
port inbound : (Encode.Value -> msg) -> Sub msg

-- MODEL

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
    }

init : Flags -> ( Model, Cmd Msg )
init flags =
    let
        initialPortModel = Api.Port.init
        
        req = Api.getTags { host = "extension" }
        portMsg = Api.Port.send GotTags req
        
        ( newPortModel, cmd ) =
            Api.Port.update
                { sendPort = outbound }
                portMsg
                initialPortModel
    in
    ( { portModel = newPortModel
      , status = "Ready"
      , title = flags.title
      , url = flags.url
      , selection = flags.selection
      , images = flags.images
      , selectedImage = List.head flags.images -- Default to first image if available
      , comment = ""
      , availableTags = []
      , selectedTags = []
      , newTagInput = ""
      }
    , cmd
    )

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

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PortMsg pMsg ->
            let
                ( newPortModel, cmd ) =
                    Api.Port.update
                        { sendPort = outbound }
                        pMsg
                        model.portModel
            in
            ( { model | portModel = newPortModel }
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
                    req = 
                        Api.submitItem
                            { host = "extension"
                            , title = model.title
                            , link = model.url
                            , image = Maybe.withDefault "" model.selectedImage
                            , extract = model.selection
                            , ownerComment = model.comment
                            , tags = model.selectedTags
                            }
                    
                    portMsg = Api.Port.send GotSubmitRes req
                    
                    -- We manually trigger the port update logic
                    ( newPortModel, cmd ) =
                        Api.Port.update
                            { sendPort = outbound }
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
            ( model, Cmd.none ) -- Ignore error for now

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
                    
                    -- Add to available tags if not present
                    newAvailable =
                        if List.member tag model.availableTags then
                            model.availableTags
                        else
                            List.sort (tag :: model.availableTags)
                in
                ( { model | selectedTags = newSelected, availableTags = newAvailable, newTagInput = "" }, Cmd.none )

-- VIEW

view : Model -> Html Msg
view model =
    div [ style "width" "100%", style "padding" "15px", style "font-family" "sans-serif" ]
        [ h3 [] [ text "Horatio Writer" ]
        
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
            
            -- Selected Tags (Chips)
            , div [ style "display" "flex", style "flex-wrap" "wrap", style "gap" "5px", style "margin-bottom" "5px" ]
                (List.map (viewTagChip model.selectedTags) model.selectedTags)

            -- Add New Tag
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

            -- Available Tags (Dropdown/List)
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
        , subscriptions = \_ -> Api.Port.subscriptions inbound PortMsg
        }
