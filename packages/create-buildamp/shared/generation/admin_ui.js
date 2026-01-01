/**
 * Admin UI Generator
 * 
 * Generates an Elm application for managing database resources.
 * "Rust once, UI never"
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate Admin UI resources
 */
export async function generateAdminUi() {
    console.log('👑 Admin UI Generation:');
    
    // Parse database models from Rust files
    const models = await discoverAndParseModels();
    
    if (models.length === 0) {
        console.log('⚠️  No database models found to generate admin UI');
        return { message: 'No models found' };
    }

    // Determine output path
    const outputPath = 'app/horatio';
    const adminSrcDir = path.join(outputPath, 'admin/src/Generated');
    
    // Ensure output directory exists
    if (!fs.existsSync(adminSrcDir)) {
        fs.mkdirSync(adminSrcDir, { recursive: true });
    }

    // Generate Resources.elm
    generateResourcesElm(models, adminSrcDir);

    console.log(`  - Generated Resources.elm with ${models.length} models`);
    console.log(`  - Output: ${path.join(adminSrcDir, 'Resources.elm')}`);
    
    return { 
        models: models.length,
        outputFile: path.join(adminSrcDir, 'Resources.elm')
    };
}

// Discover and parse database models from Rust files
async function discoverAndParseModels() {
    const allModels = [];
    const modelDirs = ['app/horatio/models/db'];
    
    // First pass: collect all models and find which are embedded in JsonBlob
    const embeddedInJsonBlob = new Set();
    
    for (const dir of modelDirs) {
        if (!fs.existsSync(dir)) continue;
        
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.rs'));
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Find JsonBlob<Type> usage to identify embedded structs
            const jsonBlobMatches = content.match(/JsonBlob<(\w+)>/g);
            if (jsonBlobMatches) {
                jsonBlobMatches.forEach(match => {
                    const type = match.match(/JsonBlob<(\w+)>/)[1];
                    embeddedInJsonBlob.add(type);
                });
            }
            
            const parsed = parseRustStruct(content, file);
            allModels.push(...parsed);
        }
    }
    
    // Second pass: filter out embedded structs (they're not database tables)
    const tableModels = allModels.filter(model => {
        if (embeddedInJsonBlob.has(model.name)) {
            console.log(`📋 Skipping ${model.name} (embedded in JsonBlob, not a database table)`);
            return false;
        }
        return true;
    });
    
    return tableModels;
}

// Parse a Rust struct from file content (reused from database_queries.js)
function parseRustStruct(content, filename) {
    const structs = [];
    const structRegex = /pub struct\s+(\w+)\s*{([^}]+)}/g;
    let match;

    while ((match = structRegex.exec(content)) !== null) {
        const [, structName, fieldsContent] = match;

        // Parse fields
        const fields = [];
        const fieldRegex = /pub\s+(\w+):\s*([^,\n]+)/g;
        let fieldMatch;

        while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
            const [, fieldName, fieldType] = fieldMatch;
            fields.push({
                name: fieldName,
                type: fieldType.trim(),
                // Check for special database types
                isPrimaryKey: fieldType.includes('DatabaseId'),
                isTimestamp: fieldType.includes('Timestamp'),
                isOptional: fieldType.includes('Option<')
            });
        }

        structs.push({
            name: structName,
            fields,
            filename
        });
    }

    return structs;
}

function generateResourcesElm(models, outputDir) {
    const resources = models.map(m => m.name);

    // Generate the Resource type
    const resourceType = `
type Resource
    = ${resources.join('\n    | ')}
`;

    // Generate toString function - convert to snake_case for API routes (matching database)
    const toStringFn = `
resourceToString : Resource -> String
resourceToString resource =
    case resource of
${resources.map(r => `        ${r} -> "${camelToSnakeCase(r)}"`).join('\n')}
`;

    // Generate fromString function
    const fromStringFn = `
resourceFromString : String -> Maybe Resource
resourceFromString str =
    case str of
${resources.map(r => `        "${camelToSnakeCase(r)}" -> Just ${r}`).join('\n')}
        _ -> Nothing
`;

    // Generate list function (for navigation)
    const allResources = `
allResources : List Resource
allResources =
    [ ${resources.join('\n    , ')}
    ]
`;

    // Generate form field functions for each model
    const formFieldFunctions = models.map(model => generateFormFields(model)).join('\n\n');
    
    // Generate table view functions for each model
    const tableViewFunctions = models.map(model => generateTableView(model)).join('\n\n');

    const content = `module Generated.Resources exposing (..)

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
-}${resourceType}

{-| Convert resource to string for routing/API calls
-}${toStringFn}

{-| Convert string to resource (for URL parsing)
-}${fromStringFn}

{-| All available resources
-}${allResources}


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

${formFieldFunctions}

getFieldsForResource : Resource -> List FormField
getFieldsForResource resource =
    case resource of
${resources.map(r => `        ${r} -> getFieldsFor${r}`).join('\n')}

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
            (List.map (\\err -> div [ class "error" ] [ text err ]) errors)

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
                , onCheck (\\checked -> updateFieldValue field.name model onUpdate (if checked then "true" else "false"))
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
${resources.map(r => `        ${r} -> view${r}Table items onEdit onDelete`).join('\n')}

${tableViewFunctions}

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
`;

    fs.writeFileSync(path.join(outputDir, 'Resources.elm'), content);
}

// Helper function to determine if a field should be included in forms/tables
function shouldIncludeField(field) {
    // Exclude infrastructure fields
    if (field.name === 'host' || field.name === 'created_at' || field.name === 'updated_at' || field.name === 'deleted_at') {
        return false;
    }
    
    // Exclude DatabaseId fields (auto-generated primary keys)
    if (field.type.startsWith('DatabaseId')) {
        return false;
    }
    
    // Exclude JsonBlob fields (too complex for simple forms/tables)
    if (field.type.startsWith('JsonBlob')) {
        return false;
    }
    
    return true;
}

// Helper function to determine if a field should be shown in tables (more permissive than forms)
function shouldShowInTable(field) {
    // Include ID for reference
    if (field.name === 'id') {
        return true;
    }
    
    // Include created_at for reference
    if (field.name === 'created_at') {
        return true;
    }
    
    // Exclude infrastructure fields
    if (field.name === 'host' || field.name === 'updated_at' || field.name === 'deleted_at') {
        return false;
    }
    
    // Exclude JsonBlob fields (too complex for tables)
    if (field.type.startsWith('JsonBlob')) {
        return false;
    }
    
    return true;
}

function generateFormFields(model) {
    const editableFields = model.fields.filter(shouldIncludeField);
    
    const fieldDefinitions = editableFields.map(field => {
        const fieldType = getElmFieldType(field.type);
        const required = !field.type.startsWith('Option');
        
        return `      { name = "${field.name}"
      , value = ""
      , fieldType = ${fieldType}
      , required = ${required ? 'True' : 'False'}
      }`;
    }).join('\n    , \n');
    
    return `{-| Get form fields for ${model.name}
-}
getFieldsFor${model.name} : List FormField
getFieldsFor${model.name} =
    [ ${fieldDefinitions}
    ]`;
}

function generateTableView(model) {
    const tableFields = model.fields.filter(shouldShowInTable);
    
    // Check if this is a relationship table (no id field, only foreign keys)
    const hasIdField = model.fields.some(f => f.name === 'id' || f.isPrimaryKey);
    const isRelationshipTable = !hasIdField && model.fields.every(f => 
        f.name.endsWith('_id') || f.name === 'created_at' || f.name === 'updated_at' || f.name === 'host'
    );
    
    // Separate id field from other fields to avoid duplication
    const idField = tableFields.find(f => f.name === 'id');
    const nonIdFields = tableFields.filter(f => f.name !== 'id');
    
    // Generate table headers
    let headers = '';
    let actionsHeader = '';
    
    if (!isRelationshipTable) {
        headers = nonIdFields.map(field => 
            `                , th [] [ text "${formatFieldName(field.name)}" ]`
        ).join('\n');
        actionsHeader = ', th [] [ text "Actions" ]';
    } else {
        // For relationship tables, show all fields including foreign keys
        headers = tableFields.map(field => 
            `                ${tableFields.indexOf(field) === 0 ? '' : ', '}th [] [ text "${formatFieldName(field.name)}" ]`
        ).join('\n');
        actionsHeader = ', th [] [ text "Actions" ]'; // Still need actions for delete
    }
    
    // Generate table row cells
    let cells = '';
    let actionsCell = '';
    
    if (!isRelationshipTable) {
        cells = nonIdFields.map(field =>
            `        , td [] [ text (getStringField "${field.name}" item) ]`
        ).join('\n');
        actionsCell = `        , td []
            [ button [ class "btn btn-sm btn-primary", onClick (onEdit (getStringField "id" item)) ] [ text "Edit" ]
            , button [ class "btn btn-sm btn-danger", onClick (onDelete (getStringField "id" item)) ] [ text "Delete" ]
            ]`;
    } else {
        // For relationship tables, show all fields, delete only (no edit)
        cells = tableFields.map(field =>
            `        ${tableFields.indexOf(field) === 0 ? '' : ', '}td [] [ text (getStringField "${field.name}" item) ]`
        ).join('\n');
        // For relationship tables, we need a compound key for delete (item_id + tag_id)
        // For now, use item_id as the identifier (this may need refinement)
        actionsCell = `        , td []
            [ button [ class "btn btn-sm btn-danger", onClick (onDelete (getStringField "item_id" item)) ] [ text "Delete" ]
            ]`;
    }
    
    const idHeaderAndCell = isRelationshipTable ? '' : `[ th [] [ text "Id" ]
${headers}`;
    const idRowAndCells = isRelationshipTable ? `[ ${cells}
${actionsCell}
        ]` : `[ td [] [ text (getStringField "id" item) ]
${cells}
${actionsCell}
        ]`;
    
    return `{-| Table view for ${model.name}
-}
view${model.name}Table : List Encode.Value -> (String -> msg) -> (String -> msg) -> Html msg
view${model.name}Table items onEdit onDelete =
    table [ class "admin-table" ]
        [ thead []
            [ tr []
                ${isRelationshipTable ? `[ ${headers}
                ${actionsHeader}
                ]` : `[ th [] [ text "Id" ]
${headers}
                ${actionsHeader}
                ]`}
            ]
        , tbody []
            (List.map (view${model.name}Row onEdit onDelete) items)
        ]

view${model.name}Row : (String -> msg) -> (String -> msg) -> Encode.Value -> Html msg  
view${model.name}Row onEdit onDelete item =
    tr []
        ${idRowAndCells}`;
}

function getElmFieldType(rustType) {
    if (rustType === 'String' || rustType === 'Option<String>' || rustType.includes('String')) {
        return 'TextInput';
    }
    if (rustType === 'i32' || rustType === 'i64' || rustType === 'u32') {
        return 'NumberInput';
    }
    if (rustType === 'bool') {
        return 'CheckboxInput';
    }
    if (rustType === 'Timestamp' || rustType === 'Option<Timestamp>') {
        return 'DateTimeInput';
    }
    return 'TextInput'; // Default
}

function formatFieldName(fieldName) {
    // Convert snake_case to Title Case
    return fieldName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function camelToSnakeCase(camelCase) {
    // Convert CamelCase to snake_case (matching database table naming)
    return camelCase
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .substring(1);
}