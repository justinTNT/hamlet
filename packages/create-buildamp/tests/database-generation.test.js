import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const createBuildampPath = path.join(__dirname, '..', 'index.js');

test('Database Module Generation', async (t) => {
    const testOutputDir = path.join(__dirname, 'temp-database-test');
    
    t.after(() => {
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    await t.test('all database models get complete codecs', async () => {
        // Run codegen to generate Database.elm
        execSync(`node ${createBuildampPath} --codegen-only --output ${testOutputDir}`, {
            cwd: path.join(__dirname, '..', '..', '..')
        });
        
        const databaseElmPath = path.join(testOutputDir, 'elm', 'Database.elm');
        assert.ok(fs.existsSync(databaseElmPath), 'Database.elm should be generated');
        
        const content = fs.readFileSync(databaseElmPath, 'utf8');
        
        // Verify all 4 database types are defined
        const requiredTypes = ['MicroblogItem', 'ItemComment', 'Tag', 'Guest'];
        for (const typeName of requiredTypes) {
            assert.ok(
                content.includes(`type alias ${typeName} =`), 
                `Should define type alias for ${typeName}`
            );
        }
        
        // Verify all models have encoders - this was the bug we fixed
        const requiredEncoders = [
            'microblogItemEncoder', // Was missing due to camelCase bug
            'itemCommentEncoder',   // Was missing due to camelCase bug  
            'tagEncoder',           // Was working
            'guestEncoder'          // Was working
        ];
        
        for (const encoderName of requiredEncoders) {
            assert.ok(
                content.includes(`${encoderName} :`), 
                `Should have encoder function ${encoderName}`
            );
            assert.ok(
                content.includes(`${encoderName} struct =`), 
                `Should have encoder implementation for ${encoderName}`
            );
        }
        
        // Verify all models have decoders
        const requiredDecoders = [
            'microblogItemDecoder', // Was missing due to camelCase bug
            'itemCommentDecoder',   // Was missing due to camelCase bug
            'tagDecoder',           // Was working
            'guestDecoder'          // Was working
        ];
        
        for (const decoderName of requiredDecoders) {
            assert.ok(
                content.includes(`${decoderName} :`), 
                `Should have decoder function ${decoderName}`
            );
            assert.ok(
                content.includes(`${decoderName} =`), 
                `Should have decoder implementation for ${decoderName}`
            );
        }
    });

    await t.test('camelCase conversion works correctly', async () => {
        const databaseElmPath = path.join(testOutputDir, 'elm', 'Database.elm');
        const content = fs.readFileSync(databaseElmPath, 'utf8');
        
        // Test specific camelCase conversions that were broken before the fix
        const camelCaseTests = [
            { type: 'MicroblogItem', expectedEncoder: 'microblogItemEncoder', expectedDecoder: 'microblogItemDecoder' },
            { type: 'ItemComment', expectedEncoder: 'itemCommentEncoder', expectedDecoder: 'itemCommentDecoder' },
            { type: 'Tag', expectedEncoder: 'tagEncoder', expectedDecoder: 'tagDecoder' },
            { type: 'Guest', expectedEncoder: 'guestEncoder', expectedDecoder: 'guestDecoder' }
        ];
        
        for (const test of camelCaseTests) {
            assert.ok(
                content.includes(`${test.expectedEncoder} : ${test.type} -> Json.Encode.Value`),
                `${test.type} should have properly camelCased encoder: ${test.expectedEncoder}`
            );
            assert.ok(
                content.includes(`${test.expectedDecoder} : Json.Decode.Decoder ${test.type}`),
                `${test.type} should have properly camelCased decoder: ${test.expectedDecoder}`
            );
        }
        
        // Verify the incorrect patterns (wrong camelCase) are NOT present (the old bug)
        const incorrectPatterns = [
            'microblogitemEncoder',  // Wrong - should be microblogItemEncoder (missing capital I)
            'itemcommentEncoder',    // Wrong - should be itemCommentEncoder (missing capital C)
            'microblogitemDecoder',  // Wrong - should be microblogItemDecoder (missing capital I)
            'itemcommentDecoder'     // Wrong - should be itemCommentDecoder (missing capital C)
        ];
        
        for (const pattern of incorrectPatterns) {
            assert.ok(
                !content.includes(pattern),
                `Should NOT contain incorrect camelCase pattern: ${pattern}`
            );
        }
    });

    await t.test('database module has proper structure', async () => {
        const databaseElmPath = path.join(testOutputDir, 'elm', 'Database.elm');
        const content = fs.readFileSync(databaseElmPath, 'utf8');
        
        // Check module declaration
        assert.ok(content.includes('module Database exposing (..)'), 'Should have correct module declaration');
        
        // Check imports
        assert.ok(content.includes('import Json.Decode'), 'Should import Json.Decode');
        assert.ok(content.includes('import Json.Encode'), 'Should import Json.Encode');
        
        // Check framework features documentation
        assert.ok(content.includes('-- Database framework features:'), 'Should document framework features');
        assert.ok(content.includes('-- ✅ Generated primary keys'), 'Should mention generated primary keys');
        assert.ok(content.includes('-- ✅ JSON serialization'), 'Should mention JSON serialization');
        
        // Check types discovered documentation  
        assert.ok(content.includes('-- Database types discovered:'), 'Should list discovered types');
        assert.ok(content.includes('-- - MicroblogItem'), 'Should list MicroblogItem in discovery');
        assert.ok(content.includes('-- - ItemComment'), 'Should list ItemComment in discovery');
        assert.ok(content.includes('-- - Tag'), 'Should list Tag in discovery');
        assert.ok(content.includes('-- - Guest'), 'Should list Guest in discovery');
    });

    await t.test('encoders handle all field types correctly', async () => {
        const databaseElmPath = path.join(testOutputDir, 'elm', 'Database.elm');
        const content = fs.readFileSync(databaseElmPath, 'utf8');
        
        // Test that complex MicroblogItem encoder handles all field types
        const microblogItemEncoderSection = content.substring(
            content.indexOf('microblogItemEncoder struct ='),
            content.indexOf('itemCommentEncoder')
        );
        
        // Check framework type encoders
        assert.ok(
            microblogItemEncoderSection.includes('(generatedEncoder) struct.id'),
            'Should use generatedEncoder for id field'
        );
        assert.ok(
            microblogItemEncoderSection.includes('(defaultValueEncoder) struct.ownerComment'),
            'Should use defaultValueEncoder for defaultValue fields'
        );
        assert.ok(
            microblogItemEncoderSection.includes('(generatedEncoder) struct.timestamp'),
            'Should use generatedEncoder for timestamp field'
        );
        
        // Check basic type encoders
        assert.ok(
            microblogItemEncoderSection.includes('(Json.Encode.string) struct.title'),
            'Should use Json.Encode.string for string fields'
        );
        assert.ok(
            microblogItemEncoderSection.includes('(Json.Encode.int) struct.viewCount'),
            'Should use Json.Encode.int for int fields'
        );
        
        // Check optional field handling
        assert.ok(
            microblogItemEncoderSection.includes('Maybe.withDefault Json.Encode.null'),
            'Should handle optional fields with Maybe.withDefault'
        );
        
        // Check list encoding
        assert.ok(
            microblogItemEncoderSection.includes('(Json.Encode.list (Json.Encode.string)) struct.tags'),
            'Should handle list fields correctly'
        );
    });

    await t.test('decoders handle all field types correctly', async () => {
        const databaseElmPath = path.join(testOutputDir, 'elm', 'Database.elm');
        const content = fs.readFileSync(databaseElmPath, 'utf8');
        
        // Test that complex MicroblogItem decoder handles all field types
        const microblogItemDecoderSection = content.substring(
            content.indexOf('microblogItemDecoder ='),
            content.indexOf('itemCommentDecoder')
        );
        
        // Check framework type decoders
        assert.ok(
            microblogItemDecoderSection.includes('(Json.Decode.field "id" (generatedDecoder))'),
            'Should use generatedDecoder for id field'
        );
        assert.ok(
            microblogItemDecoderSection.includes('(Json.Decode.field "timestamp" (generatedDecoder))'),
            'Should use generatedDecoder for timestamp field'  
        );
        assert.ok(
            microblogItemDecoderSection.includes('(Json.Decode.field "owner_comment" (defaultValueDecoder))'),
            'Should use defaultValueDecoder for defaultValue fields'
        );
        
        // Check basic type decoders
        assert.ok(
            microblogItemDecoderSection.includes('(Json.Decode.field "title" (Json.Decode.string))'),
            'Should use Json.Decode.string for string fields'
        );
        assert.ok(
            microblogItemDecoderSection.includes('(Json.Decode.field "view_count" (Json.Decode.int))'),
            'Should use Json.Decode.int for int fields'
        );
        
        // Check optional field handling
        assert.ok(
            microblogItemDecoderSection.includes('(Json.Decode.nullable (Json.Decode.string))'),
            'Should handle optional fields with Json.Decode.nullable'
        );
        
        // Check list decoding
        assert.ok(
            microblogItemDecoderSection.includes('(Json.Decode.list (Json.Decode.string))'),
            'Should handle list fields correctly'
        );
    });

    await t.test('field name conversion matches Rust snake_case', async () => {
        const databaseElmPath = path.join(testOutputDir, 'elm', 'Database.elm');
        const content = fs.readFileSync(databaseElmPath, 'utf8');
        
        // Check that Elm field names in JSON match Rust snake_case field names
        const fieldMappingTests = [
            { elmField: 'ownerComment', jsonField: 'owner_comment' },
            { elmField: 'viewCount', jsonField: 'view_count' },
            { elmField: 'itemId', jsonField: 'item_id' },
            { elmField: 'guestId', jsonField: 'guest_id' },
            { elmField: 'parentId', jsonField: 'parent_id' },
            { elmField: 'authorName', jsonField: 'author_name' },
            { elmField: 'sessionId', jsonField: 'session_id' },
            { elmField: 'createdAt', jsonField: 'created_at' }
        ];
        
        for (const mapping of fieldMappingTests) {
            // Check encoder uses correct JSON field name
            assert.ok(
                content.includes(`"${mapping.jsonField}", `) && content.includes(`struct.${mapping.elmField}`),
                `Should map Elm field ${mapping.elmField} to JSON field ${mapping.jsonField} in encoder`
            );
            
            // Check decoder uses correct JSON field name
            assert.ok(
                content.includes(`Json.Decode.field "${mapping.jsonField}"`),
                `Should decode from JSON field ${mapping.jsonField} in decoder`
            );
        }
    });
});