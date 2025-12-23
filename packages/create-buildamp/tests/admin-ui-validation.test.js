import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Generated Admin UI Validation', async (t) => {
    // Test the existing generated admin UI files
    const resourcesElmPath = path.join(process.cwd(), '..', '..', 'app', 'horatio', 'admin', 'src', 'Generated', 'Resources.elm');
    const content = fs.readFileSync(resourcesElmPath, 'utf8');
    
    await t.test('Resources.elm exists and has proper module structure', async () => {
        assert.ok(fs.existsSync(resourcesElmPath), 'Resources.elm should exist');
        
        // Check module declaration
        assert.ok(content.includes('module Generated.Resources exposing (..)'), 'Should have proper module declaration');
        
        // Check imports
        assert.ok(content.includes('import Html exposing (..)'), 'Should import Html');
        assert.ok(content.includes('import Json.Encode'), 'Should import Json.Encode');
        assert.ok(content.includes('import Json.Decode'), 'Should import Json.Decode');
        
        // Check documentation
        assert.ok(content.includes('Auto-generated admin UI resources'), 'Should have documentation');
    });

    await t.test('includes all expected database models', async () => {
        // Check for all database types discovered from Rust models
        // Note: MicroblogItemData is filtered out because it's embedded in JsonBlob<MicroblogItemData>
        const expectedTypes = ['Guest', 'ItemComment', 'ItemTag', 'MicroblogItem', 'Tag'];
        
        for (const typeName of expectedTypes) {
            assert.ok(content.includes(typeName), `Should include ${typeName} resource`);
        }
        
        // Check Resource type definition
        assert.ok(content.includes('type Resource'), 'Should define Resource union type');
        
        // Check conversion functions
        assert.ok(content.includes('resourceToString : Resource -> String'), 'Should have resourceToString function');
        assert.ok(content.includes('resourceFromString : String -> Maybe Resource'), 'Should have resourceFromString function');
    });

    await t.test('generates proper form fields for each resource', async () => {
        // Check that each resource has form field functions
        // Note: MicroblogItemData excluded because it's embedded in JsonBlob
        const resourceFormFunctions = [
            'getFieldsForGuest',
            'getFieldsForItemComment', 
            'getFieldsForItemTag',
            'getFieldsForMicroblogItem',
            'getFieldsForTag'
        ];
        
        for (const functionName of resourceFormFunctions) {
            assert.ok(content.includes(functionName), `Should include ${functionName} function`);
        }
        
        // Check FormField type definition
        assert.ok(content.includes('type alias FormField ='), 'Should define FormField type');
        assert.ok(content.includes('name : String'), 'FormField should have name field');
        assert.ok(content.includes('fieldType : FieldType'), 'FormField should have fieldType field');
        assert.ok(content.includes('required : Bool'), 'FormField should have required field');
    });

    await t.test('includes proper field types for different input components', async () => {
        // Check FieldType union type
        const expectedFieldTypes = [
            'TextInput',
            'NumberInput', 
            'CheckboxInput',
            'TextareaInput',
            'DateTimeInput',
            'JsonEditor',
            'RichTextEditor',
            'ReadOnlyId'
        ];
        
        assert.ok(content.includes('type FieldType'), 'Should define FieldType union type');
        
        for (const fieldType of expectedFieldTypes) {
            assert.ok(content.includes(fieldType), `Should include ${fieldType} field type`);
        }
    });

    await t.test('generates form view components', async () => {
        // Check main form view function
        assert.ok(content.includes('viewForm : FormModel'), 'Should have viewForm function');
        assert.ok(content.includes('viewFormFields'), 'Should have viewFormFields function');
        assert.ok(content.includes('viewFormField'), 'Should have viewFormField function');
        assert.ok(content.includes('viewFieldInput'), 'Should have viewFieldInput function');
        
        // Check that it handles different input types
        assert.ok(content.includes('case field.fieldType of'), 'Should dispatch on field type');
        assert.ok(content.includes('TextInput ->'), 'Should handle TextInput case');
        assert.ok(content.includes('NumberInput ->'), 'Should handle NumberInput case');
        assert.ok(content.includes('JsonEditor ->'), 'Should handle JsonEditor case');
    });

    await t.test('generates table views for all resources', async () => {
        // Check table view functions
        // Note: MicroblogItemData excluded because it's embedded in JsonBlob
        const tableViewFunctions = [
            'viewGuestTable',
            'viewItemCommentTable',
            'viewItemTagTable', 
            'viewMicroblogItemTable',
            'viewTagTable'
        ];
        
        for (const functionName of tableViewFunctions) {
            assert.ok(content.includes(functionName), `Should include ${functionName} function`);
        }
        
        // Check main table dispatcher
        assert.ok(content.includes('viewTable : TableConfig'), 'Should have main viewTable function');
        assert.ok(content.includes('case config.resource of'), 'Should dispatch on resource type');
        
        // Check table structure
        assert.ok(content.includes('table [ class "admin-table" ]'), 'Should use admin-table class');
        assert.ok(content.includes('thead'), 'Should have table header');
        assert.ok(content.includes('tbody'), 'Should have table body');
    });

    await t.test('includes utility functions for data extraction', async () => {
        // Check utility functions for working with JSON data
        assert.ok(content.includes('getStringField : String -> Encode.Value -> String'), 'Should have getStringField function');
        assert.ok(content.includes('getIntField : String -> Encode.Value -> Int'), 'Should have getIntField function');
        
        // Check that these functions handle decoding properly
        assert.ok(content.includes('Decode.decodeValue'), 'Should use Decode.decodeValue');
        assert.ok(content.includes('Decode.field'), 'Should use Decode.field');
    });

    await t.test('maps Rust field types to appropriate UI components', async () => {
        // Check specific field type mappings we can verify in the generated code
        
        // JSON fields should use JsonEditor
        assert.ok(content.includes('JsonEditor') && content.includes('json-editor'), 'Should map JSON fields to JsonEditor');
        
        // Rich content fields should use RichTextEditor
        assert.ok(content.includes('RichTextEditor') && content.includes('rich-text-editor'), 'Should map rich content to RichTextEditor');
        
        // Number fields should use NumberInput
        assert.ok(content.includes('NumberInput') && content.includes('type_ "number"'), 'Should map numbers to NumberInput');
        
        // DateTime fields should use DateTimeInput 
        assert.ok(content.includes('DateTimeInput') && content.includes('datetime-local'), 'Should map timestamps to DateTimeInput');
    });

    await t.test('includes proper CSS classes and styling hooks', async () => {
        // Check that generated components have proper CSS classes for styling
        const expectedClasses = [
            'admin-form',
            'admin-table', 
            'form-control',
            'form-field',
            'field-label',
            'form-actions',
            'btn btn-primary',
            'btn btn-secondary'
        ];
        
        for (const className of expectedClasses) {
            assert.ok(content.includes(className), `Should include ${className} CSS class`);
        }
    });

    await t.test('generates proper action buttons for CRUD operations', async () => {
        // Check that tables include action buttons
        assert.ok(content.includes('text "Edit"'), 'Should have Edit buttons');
        assert.ok(content.includes('text "Delete"'), 'Should have Delete buttons');
        assert.ok(content.includes('text "Save"'), 'Should have Save button');
        assert.ok(content.includes('text "Cancel"'), 'Should have Cancel button');
        
        // Check button styling
        assert.ok(content.includes('btn-primary'), 'Should style primary buttons');
        assert.ok(content.includes('btn-secondary'), 'Should style secondary buttons');
        assert.ok(content.includes('btn-danger'), 'Should style delete buttons as dangerous');
    });
});