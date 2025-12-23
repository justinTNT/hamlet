module Generated.Resources exposing (..)

{-| Auto-generated admin UI resources from Rust database models

This module provides type-safe admin forms and views for all database entities.
Generated from Rust structs in app/*/models/db/

# Resource Types
@docs Resource, resourceToString, allResources

# Form Views  
@docs viewForm, FormModel, initFormModel

# Table Views
@docs viewTable, TableConfig

# Utilities
@docs resourceFromString

-}

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Json.Encode as Encode
import Json.Decode as Decode


-- RESOURCE TYPES

{-| All available database resources
-}
type Resource
    = Guest
    | ItemComment
    | ItemTag
    | MicroblogItem
    | Tag


{-| Convert resource to string for routing/API calls
-}
resourceToString : Resource -> String
resourceToString resource =
    case resource of
        Guest -> "guest"
        ItemComment -> "item_comment"
        ItemTag -> "item_tag"
        MicroblogItem -> "microblog_item"
        Tag -> "tag"


{-| Convert string to resource (for URL parsing)
-}
resourceFromString : String -> Maybe Resource
resourceFromString str =
    case str of
        "guest" -> Just Guest
        "item_comment" -> Just ItemComment
        "item_tag" -> Just ItemTag
        "microblog_item" -> Just MicroblogItem
        "tag" -> Just Tag
        _ -> Nothing


{-| All available resources
-}
allResources : List Resource
allResources =
    [ Guest
    , ItemComment
    , ItemTag
    , MicroblogItem
    , Tag
    ]



-- FORM MODELS AND VIEWS

{-| Generic form model for all resources
-}
type alias FormModel =
    { resource : Resource
    , fields : List FormField
    , errors : List String
    }

type alias FormField =
    { name : String
    , value : String
    , fieldType : FieldType
    , required : Bool
    }

type FieldType
    = TextInput
    | NumberInput  
    | CheckboxInput
    | TextareaInput
    | DateTimeInput
    | JsonEditor
    | RichTextEditor
    | ReadOnlyId


{-| Initialize form model for a resource
-}
initFormModel : Resource -> FormModel
initFormModel resource =
    { resource = resource
    , fields = getFieldsForResource resource
    , errors = []
    }

{-| Get form fields for Guest
-}
getFieldsForGuest : List FormField
getFieldsForGuest =
    [       { name = "name"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    , 
      { name = "picture"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    , 
      { name = "session_id"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    ]

{-| Get form fields for ItemComment
-}
getFieldsForItemComment : List FormField
getFieldsForItemComment =
    [       { name = "item_id"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    , 
      { name = "guest_id"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    , 
      { name = "parent_id"
      , value = ""
      , fieldType = TextInput
      , required = False
      }
    , 
      { name = "author_name"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    , 
      { name = "text"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    ]

{-| Get form fields for ItemTag
-}
getFieldsForItemTag : List FormField
getFieldsForItemTag =
    [       { name = "item_id"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    , 
      { name = "tag_id"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    ]

{-| Get form fields for MicroblogItem
-}
getFieldsForMicroblogItem : List FormField
getFieldsForMicroblogItem =
    [       { name = "view_count"
      , value = ""
      , fieldType = NumberInput
      , required = True
      }
    ]

{-| Get form fields for Tag
-}
getFieldsForTag : List FormField
getFieldsForTag =
    [       { name = "name"
      , value = ""
      , fieldType = TextInput
      , required = True
      }
    ]

getFieldsForResource : Resource -> List FormField
getFieldsForResource resource =
    case resource of
        Guest -> getFieldsForGuest
        ItemComment -> getFieldsForItemComment
        ItemTag -> getFieldsForItemTag
        MicroblogItem -> getFieldsForMicroblogItem
        Tag -> getFieldsForTag

-- FORM VIEWS

{-| Main form view dispatcher
-}
viewForm : FormModel -> (FormModel -> msg) -> (FormModel -> msg) -> msg -> Html msg
viewForm model onUpdate onSubmit onCancel =
    div [ class "admin-form" ]
        [ h2 [] [ text ("Edit " ++ resourceToString model.resource) ]
        , viewFormErrors model.errors
        , viewFormFields model onUpdate
        , div [ class "form-actions" ]
            [ button 
                [ onClick (onSubmit model)
                , class "btn btn-primary" 
                ] 
                [ text "Save" ]
            , button 
                [ class "btn btn-secondary"
                , type_ "button"
                , onClick onCancel
                ] 
                [ text "Cancel" ]
            ]
        ]

viewFormErrors : List String -> Html msg
viewFormErrors errors =
    if List.isEmpty errors then
        text ""
    else
        div [ class "form-errors" ]
            (List.map (\err -> div [ class "error" ] [ text err ]) errors)

viewFormFields : FormModel -> (FormModel -> msg) -> Html msg
viewFormFields model onUpdate =
    div [ class "form-fields" ]
        (List.map (viewFormField model onUpdate) model.fields)

viewFormField : FormModel -> (FormModel -> msg) -> FormField -> Html msg
viewFormField model onUpdate field =
    div [ class ("form-field form-field-" ++ fieldTypeToString field.fieldType) ]
        [ label [ class "field-label" ] [ text field.name ]
        , viewFieldInput field onUpdate model
        ]

viewFieldInput : FormField -> (FormModel -> msg) -> FormModel -> Html msg
viewFieldInput field onUpdate model =
    case field.fieldType of
        TextInput ->
            input 
                [ type_ "text"
                , value field.value
                , onInput (updateFieldValue field.name model onUpdate)
                , class "form-control"
                ] []
        
        NumberInput ->
            input 
                [ type_ "number"
                , value field.value
                , onInput (updateFieldValue field.name model onUpdate)
                , class "form-control"
                ] []
        
        CheckboxInput ->
            input 
                [ type_ "checkbox"
                , checked (field.value == "true")
                , onCheck (\checked -> updateFieldValue field.name model onUpdate (if checked then "true" else "false"))
                , class "form-control"
                ] []
        
        TextareaInput ->
            textarea 
                [ value field.value
                , onInput (updateFieldValue field.name model onUpdate)
                , class "form-control"
                , rows 4
                ] []
        
        RichTextEditor ->
            div [ class "rich-text-editor" ]
                [ textarea 
                    [ value field.value
                    , onInput (updateFieldValue field.name model onUpdate)
                    , class "form-control markdown-editor"
                    , rows 6
                    , placeholder "Enter markdown..."
                    ] []
                , div [ class "markdown-preview" ]
                    [ text "Preview: (markdown rendering would go here)" ]
                ]
        
        JsonEditor ->
            textarea 
                [ value field.value
                , onInput (updateFieldValue field.name model onUpdate)
                , class "form-control json-editor"
                , rows 8
                ] []
        
        ReadOnlyId ->
            input 
                [ type_ "text"
                , value field.value
                , disabled True
                , class "form-control"
                ] []
        
        DateTimeInput ->
            input 
                [ type_ "datetime-local"
                , value field.value
                , onInput (updateFieldValue field.name model onUpdate)
                , class "form-control"
                ] []

updateFieldValue : String -> FormModel -> (FormModel -> msg) -> String -> msg
updateFieldValue fieldName model onUpdate newValue =
    let
        updateField field =
            if field.name == fieldName then
                { field | value = newValue }
            else
                field
        
        updatedModel =
            { model | fields = List.map updateField model.fields }
    in
    onUpdate updatedModel

fieldTypeToString : FieldType -> String
fieldTypeToString fieldType =
    case fieldType of
        TextInput -> "text"
        NumberInput -> "number"
        CheckboxInput -> "checkbox"
        TextareaInput -> "textarea"
        DateTimeInput -> "datetime"
        JsonEditor -> "json"
        RichTextEditor -> "rich-text"
        ReadOnlyId -> "readonly"

-- TABLE VIEWS

type alias TableConfig =
    { resource : Resource
    , sortField : String
    , sortDirection : String
    , currentPage : Int
    , itemsPerPage : Int
    }

{-| Main table view dispatcher
-}
viewTable : TableConfig -> List Encode.Value -> (String -> msg) -> (String -> msg) -> Html msg
viewTable config items onEdit onDelete =
    case config.resource of
        Guest -> viewGuestTable items onEdit onDelete
        ItemComment -> viewItemCommentTable items onEdit onDelete
        ItemTag -> viewItemTagTable items onEdit onDelete
        MicroblogItem -> viewMicroblogItemTable items onEdit onDelete
        Tag -> viewTagTable items onEdit onDelete

{-| Table view for Guest
-}
viewGuestTable : List Encode.Value -> (String -> msg) -> (String -> msg) -> Html msg
viewGuestTable items onEdit onDelete =
    table [ class "admin-table" ]
        [ thead []
            [ tr []
                [ th [] [ text "Id" ]
                , th [] [ text "Name" ]
                , th [] [ text "Picture" ]
                , th [] [ text "Session Id" ]
                , th [] [ text "Created At" ]
                , th [] [ text "Actions" ]
                ]
            ]
        , tbody []
            (List.map (viewGuestRow onEdit onDelete) items)
        ]

viewGuestRow : (String -> msg) -> (String -> msg) -> Encode.Value -> Html msg  
viewGuestRow onEdit onDelete item =
    tr []
        [ td [] [ text (getStringField "id" item) ]
        , td [] [ text (getStringField "name" item) ]
        , td [] [ text (getStringField "picture" item) ]
        , td [] [ text (getStringField "session_id" item) ]
        , td [] [ text (getStringField "created_at" item) ]
        , td []
            [ button [ class "btn btn-sm btn-primary", onClick (onEdit (getStringField "id" item)) ] [ text "Edit" ]
            , button [ class "btn btn-sm btn-danger", onClick (onDelete (getStringField "id" item)) ] [ text "Delete" ]
            ]
        ]

{-| Table view for ItemComment
-}
viewItemCommentTable : List Encode.Value -> (String -> msg) -> (String -> msg) -> Html msg
viewItemCommentTable items onEdit onDelete =
    table [ class "admin-table" ]
        [ thead []
            [ tr []
                [ th [] [ text "Id" ]
                , th [] [ text "Item Id" ]
                , th [] [ text "Guest Id" ]
                , th [] [ text "Parent Id" ]
                , th [] [ text "Author Name" ]
                , th [] [ text "Text" ]
                , th [] [ text "Created At" ]
                , th [] [ text "Actions" ]
                ]
            ]
        , tbody []
            (List.map (viewItemCommentRow onEdit onDelete) items)
        ]

viewItemCommentRow : (String -> msg) -> (String -> msg) -> Encode.Value -> Html msg  
viewItemCommentRow onEdit onDelete item =
    tr []
        [ td [] [ text (getStringField "id" item) ]
        , td [] [ text (getStringField "item_id" item) ]
        , td [] [ text (getStringField "guest_id" item) ]
        , td [] [ text (getStringField "parent_id" item) ]
        , td [] [ text (getStringField "author_name" item) ]
        , td [] [ text (getStringField "text" item) ]
        , td [] [ text (getStringField "created_at" item) ]
        , td []
            [ button [ class "btn btn-sm btn-primary", onClick (onEdit (getStringField "id" item)) ] [ text "Edit" ]
            , button [ class "btn btn-sm btn-danger", onClick (onDelete (getStringField "id" item)) ] [ text "Delete" ]
            ]
        ]

{-| Table view for ItemTag
-}
viewItemTagTable : List Encode.Value -> (String -> msg) -> (String -> msg) -> Html msg
viewItemTagTable items onEdit onDelete =
    table [ class "admin-table" ]
        [ thead []
            [ tr []
                [                 th [] [ text "Item Id" ]
                , th [] [ text "Tag Id" ]
                , th [] [ text "Actions" ]
                ]
            ]
        , tbody []
            (List.map (viewItemTagRow onEdit onDelete) items)
        ]

viewItemTagRow : (String -> msg) -> (String -> msg) -> Encode.Value -> Html msg  
viewItemTagRow onEdit onDelete item =
    tr []
        [         td [] [ text (getStringField "item_id" item) ]
        , td [] [ text (getStringField "tag_id" item) ]
        , td []
            [ button [ class "btn btn-sm btn-danger", onClick (onDelete (getStringField "item_id" item)) ] [ text "Delete" ]
            ]
        ]

{-| Table view for MicroblogItem
-}
viewMicroblogItemTable : List Encode.Value -> (String -> msg) -> (String -> msg) -> Html msg
viewMicroblogItemTable items onEdit onDelete =
    table [ class "admin-table" ]
        [ thead []
            [ tr []
                [ th [] [ text "Id" ]
                , th [] [ text "Created At" ]
                , th [] [ text "View Count" ]
                , th [] [ text "Actions" ]
                ]
            ]
        , tbody []
            (List.map (viewMicroblogItemRow onEdit onDelete) items)
        ]

viewMicroblogItemRow : (String -> msg) -> (String -> msg) -> Encode.Value -> Html msg  
viewMicroblogItemRow onEdit onDelete item =
    tr []
        [ td [] [ text (getStringField "id" item) ]
        , td [] [ text (getStringField "created_at" item) ]
        , td [] [ text (getStringField "view_count" item) ]
        , td []
            [ button [ class "btn btn-sm btn-primary", onClick (onEdit (getStringField "id" item)) ] [ text "Edit" ]
            , button [ class "btn btn-sm btn-danger", onClick (onDelete (getStringField "id" item)) ] [ text "Delete" ]
            ]
        ]

{-| Table view for Tag
-}
viewTagTable : List Encode.Value -> (String -> msg) -> (String -> msg) -> Html msg
viewTagTable items onEdit onDelete =
    table [ class "admin-table" ]
        [ thead []
            [ tr []
                [ th [] [ text "Id" ]
                , th [] [ text "Name" ]
                , th [] [ text "Actions" ]
                ]
            ]
        , tbody []
            (List.map (viewTagRow onEdit onDelete) items)
        ]

viewTagRow : (String -> msg) -> (String -> msg) -> Encode.Value -> Html msg  
viewTagRow onEdit onDelete item =
    tr []
        [ td [] [ text (getStringField "id" item) ]
        , td [] [ text (getStringField "name" item) ]
        , td []
            [ button [ class "btn btn-sm btn-primary", onClick (onEdit (getStringField "id" item)) ] [ text "Edit" ]
            , button [ class "btn btn-sm btn-danger", onClick (onDelete (getStringField "id" item)) ] [ text "Delete" ]
            ]
        ]

-- UTILITY FUNCTIONS

{-| Extract string field from JSON value
-}
getStringField : String -> Encode.Value -> String
getStringField fieldName value =
    case Decode.decodeValue (Decode.field fieldName Decode.string) value of
        Ok str -> str
        Err _ -> ""

{-| Extract int field from JSON value  
-}
getIntField : String -> Encode.Value -> Int
getIntField fieldName value =
    case Decode.decodeValue (Decode.field fieldName Decode.int) value of
        Ok num -> num
        Err _ -> 0
