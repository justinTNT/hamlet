import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
    extractTypesFromSourceDirectory, 
    generateElmModuleFromRustTypes 
} from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('SSE and KV Type Extraction', async (t) => {
    await t.test('extractTypesFromSourceDirectory handles non-existent directory', async () => {
        const types = await extractTypesFromSourceDirectory('/non/existent/directory');
        assert.deepStrictEqual(types, [], 'Should return empty array for non-existent directory');
    });

    await t.test('extractTypesFromSourceDirectory parses basic struct', async () => {
        // Create temporary test directory
        const tempDir = path.join(__dirname, 'temp-sse-test');
        fs.mkdirSync(tempDir, { recursive: true });
        
        const rustCode = `pub struct TestEvent {
    pub event_id: String,
    pub timestamp: i64,
    pub optional_data: Option<String>,
    pub tags: Vec<String>,
}`;
        
        fs.writeFileSync(path.join(tempDir, 'test_event.rs'), rustCode);
        
        const types = await extractTypesFromSourceDirectory(tempDir);
        
        assert.strictEqual(types.length, 1, 'Should extract one type');
        assert.strictEqual(types[0].name, 'TestEvent', 'Should extract correct type name');
        assert.strictEqual(types[0].fields.length, 4, 'Should extract all fields');
        
        const fields = types[0].fields;
        assert.strictEqual(fields[0].name, 'event_id');
        assert.strictEqual(fields[0].type, 'String');
        assert.strictEqual(fields[1].name, 'timestamp');
        assert.strictEqual(fields[1].type, 'Int');
        assert.strictEqual(fields[2].name, 'optional_data');
        assert.strictEqual(fields[2].type, 'Maybe String');
        assert.strictEqual(fields[3].name, 'tags');
        assert.strictEqual(fields[3].type, 'List String');
        
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    await t.test('extractTypesFromSourceDirectory handles multiple structs in one file', async () => {
        const tempDir = path.join(__dirname, 'temp-multi-test');
        fs.mkdirSync(tempDir, { recursive: true });
        
        const rustCode = `pub struct UserPresenceEvent {
    pub user_id: String,
    pub status: String,
}

pub struct ChatMessage {
    pub message_id: String,
    pub content: String,
    pub author: String,
}`;
        
        fs.writeFileSync(path.join(tempDir, 'events.rs'), rustCode);
        
        const types = await extractTypesFromSourceDirectory(tempDir);
        
        assert.strictEqual(types.length, 2, 'Should extract two types');
        assert.strictEqual(types[0].name, 'UserPresenceEvent');
        assert.strictEqual(types[1].name, 'ChatMessage');
        
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    await t.test('generateElmModuleFromRustTypes creates proper Elm module', async () => {
        const rustTypes = [
            {
                name: 'TestCache',
                fields: [
                    { name: 'key', type: 'String' },
                    { name: 'value', type: 'String' },
                    { name: 'ttl', type: 'Int' }
                ]
            }
        ];
        
        const config = {
            comment: '-- Test KV module',
            source: '-- Generated from: test/',
            features: ['-- ✅ Test feature']
        };
        
        const elmCode = generateElmModuleFromRustTypes('KeyValue', rustTypes, config);
        
        // Check module structure
        assert.ok(elmCode.includes('module KeyValue exposing (..)'), 'Should have correct module declaration');
        assert.ok(elmCode.includes('import Json.Decode'), 'Should import Json.Decode');
        assert.ok(elmCode.includes('import Json.Encode'), 'Should import Json.Encode');
        
        // Check config sections
        assert.ok(elmCode.includes('-- Test KV module'), 'Should include comment');
        assert.ok(elmCode.includes('-- Generated from: test/'), 'Should include source');
        assert.ok(elmCode.includes('-- ✅ Test feature'), 'Should include features');
        
        // Check type definition
        assert.ok(elmCode.includes('type alias TestCache ='), 'Should define type alias');
        assert.ok(elmCode.includes('key : String'), 'Should include key field');
        assert.ok(elmCode.includes('value : String'), 'Should include value field');  
        assert.ok(elmCode.includes('ttl : Int'), 'Should include ttl field');
        
        // Check type discovery comments
        assert.ok(elmCode.includes('-- - TestCache'), 'Should list discovered types');
    });

    await t.test('generateElmModuleFromRustTypes handles empty types', async () => {
        const elmCode = generateElmModuleFromRustTypes('EmptyModule', [], {
            comment: '-- Empty test module',
            source: '-- Test source',
            features: []
        });
        
        assert.ok(elmCode.includes('module EmptyModule exposing (..)'), 'Should have correct module declaration');
        assert.ok(elmCode.includes('-- Note: EmptyModule types are typically simple'), 'Should include note for empty types');
        assert.ok(!elmCode.includes('type alias'), 'Should not include any type aliases');
    });

    await t.test('Rust to Elm type conversion works correctly', async () => {
        const tempDir = path.join(__dirname, 'temp-type-test');
        fs.mkdirSync(tempDir, { recursive: true });
        
        const rustCode = `pub struct TypeTest {
    pub str_field: String,
    pub i32_field: i32,
    pub i64_field: i64,
    pub u32_field: u32,
    pub u64_field: u64,
    pub f32_field: f32,
    pub f64_field: f64,
    pub bool_field: bool,
    pub option_field: Option<String>,
    pub vec_field: Vec<i32>,
    pub nested_option: Option<Vec<String>>,
}`;
        
        fs.writeFileSync(path.join(tempDir, 'types.rs'), rustCode);
        
        const types = await extractTypesFromSourceDirectory(tempDir);
        const typeTest = types[0];
        
        const fieldTypes = typeTest.fields.map(f => f.type);
        
        assert.ok(fieldTypes.includes('String'), 'String should map to String');
        assert.ok(fieldTypes.includes('Int'), 'i32/i64/u32/u64 should map to Int');
        assert.ok(fieldTypes.includes('Float'), 'f32/f64 should map to Float');
        assert.ok(fieldTypes.includes('Bool'), 'bool should map to Bool');
        assert.ok(fieldTypes.includes('Maybe String'), 'Option<String> should map to Maybe String');
        assert.ok(fieldTypes.includes('List Int'), 'Vec<i32> should map to List Int');
        assert.ok(fieldTypes.includes('Maybe List String'), 'Option<Vec<String>> should map to Maybe List String');
        
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    await t.test('Integration with actual project SSE types', async () => {
        // Test against the actual project's SSE directory if it exists
        const projectRoot = path.join(__dirname, '..', '..', '..');
        const sseDir = path.join(projectRoot, 'src', 'models', 'sse');
        
        if (fs.existsSync(sseDir)) {
            const sseTypes = await extractTypesFromSourceDirectory(sseDir);
            
            // Should find the actual SSE types we know exist
            const typeNames = sseTypes.map(t => t.name);
            assert.ok(typeNames.includes('NewCommentEvent'), 'Should find NewCommentEvent');
            assert.ok(typeNames.includes('UserPresenceEvent'), 'Should find UserPresenceEvent');
            
            // Generate actual Elm module
            const sseElm = generateElmModuleFromRustTypes('ServerSentEvents', sseTypes, {
                comment: '-- Contains real-time event types for SSE/WebSocket',
                source: '-- Generated from: src/models/sse/',
                features: ['-- ✅ Real-time event broadcasting']
            });
            
            assert.ok(sseElm.includes('type alias NewCommentEvent'), 'Generated Elm should include NewCommentEvent');
            assert.ok(sseElm.includes('type alias UserPresenceEvent'), 'Generated Elm should include UserPresenceEvent');
        }
    });

    await t.test('Integration with actual project KV types', async () => {
        // Test against the actual project's KV directory if it exists
        const projectRoot = path.join(__dirname, '..', '..', '..');
        const kvDir = path.join(projectRoot, 'src', 'models', 'kv');
        
        if (fs.existsSync(kvDir)) {
            const kvTypes = await extractTypesFromSourceDirectory(kvDir);
            
            // Should find the actual KV types we know exist
            const typeNames = kvTypes.map(t => t.name);
            assert.ok(typeNames.includes('TestCache'), 'Should find TestCache');
            assert.ok(typeNames.includes('UserSession'), 'Should find UserSession');
            
            // Generate actual Elm module
            const kvElm = generateElmModuleFromRustTypes('KeyValue', kvTypes, {
                comment: '-- Contains key-value store types for simple persistence',
                source: '-- Generated from: src/models/kv/',
                features: ['-- ✅ Simple key-value persistence']
            });
            
            assert.ok(kvElm.includes('type alias TestCache'), 'Generated Elm should include TestCache');
            assert.ok(kvElm.includes('type alias UserSession'), 'Generated Elm should include UserSession');
        }
    });

    await t.test('Error handling for malformed Rust code', async () => {
        const tempDir = path.join(__dirname, 'temp-malformed-test');
        fs.mkdirSync(tempDir, { recursive: true });
        
        // Invalid Rust code
        const badRustCode = `pub struct InvalidStruct {
    missing_type_field,
    pub incomplete: 
}`;
        
        fs.writeFileSync(path.join(tempDir, 'bad.rs'), badRustCode);
        
        const types = await extractTypesFromSourceDirectory(tempDir);
        
        // Should gracefully handle malformed code without crashing
        assert.ok(Array.isArray(types), 'Should return array even with malformed code');
        
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
});