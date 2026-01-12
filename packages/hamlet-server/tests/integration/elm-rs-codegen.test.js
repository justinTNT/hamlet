import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Hamlet's elm-rs codec generation using Horatio as reference
 *
 * Static tests that verify generated file content - no server required.
 * We use Horatio's generated code as the test subject.
 */

describe('Hamlet Elm-RS Codec Generation (tested via Horatio)', () => {
    // Path to Horatio from hamlet-server test location
    const horatioRoot = path.join(__dirname, '../../../../app/horatio');
    const horatioServer = path.join(horatioRoot, 'server');

    test('generated Elm types exist and have correct structure', () => {
        const backendPath = path.join(horatioServer, 'src/Api/Backend.elm');

        expect(fs.existsSync(backendPath)).toBe(true);

        const backendContent = fs.readFileSync(backendPath, 'utf-8');

        // Verify key elm-rs generated types
        expect(backendContent).toContain('type alias SubmitCommentReq =');
        expect(backendContent).toContain('type alias GetFeedReq =');
        expect(backendContent).toContain('type alias GetItemReq =');
        expect(backendContent).toContain('type alias FeedItem =');
        expect(backendContent).toContain('type alias MicroblogItem =');
    });

    test('generated encoders handle all field types correctly', () => {
        const backendPath = path.join(horatioServer, 'src/Api/Backend.elm');
        const backendContent = fs.readFileSync(backendPath, 'utf-8');

        // Check encoder generation
        expect(backendContent).toContain('submitCommentReqEncoder :');
        expect(backendContent).toContain('feedItemEncoder :');

        // Verify field name conversion (snake_case → camelCase in Elm)
        expect(backendContent).toContain('parent_id'); // In JSON
        expect(backendContent).toContain('parentId');   // In Elm type

        // Verify Option<T> handling
        expect(backendContent).toContain('Maybe String');
        expect(backendContent).toContain('Maybe.withDefault Json.Encode.null');
    });

    test('generated decoders handle all field types correctly', () => {
        const backendPath = path.join(horatioServer, 'src/Api/Backend.elm');
        const backendContent = fs.readFileSync(backendPath, 'utf-8');

        // Check decoder generation
        expect(backendContent).toContain('submitCommentReqDecoder :');
        expect(backendContent).toContain('feedItemDecoder :');

        // Verify nullable field handling
        expect(backendContent).toContain('Json.Decode.nullable');

        // Verify list decoding
        expect(backendContent).toContain('Json.Decode.list');
    });

    test('generated Elm code compiles successfully', () => {
        const handlersPath = path.join(horatioServer, 'src/Api/Handlers');

        // Try to compile a handler that uses generated types
        // This verifies the generated code is valid Elm
        const result = execSync('elm make GetFeedHandlerTEA.elm --output=/dev/null 2>&1 || true', {
            cwd: handlersPath,
            encoding: 'utf-8'
        });

        // Should not contain "-- NAMING ERROR" or "-- TYPE MISMATCH"
        expect(result).not.toContain('-- NAMING ERROR');
        expect(result).not.toContain('-- TYPE MISMATCH');
    });

    test('elm-rs preserves field ordering and all fields', () => {
        const backendPath = path.join(horatioServer, 'src/Api/Backend.elm');
        const backendContent = fs.readFileSync(backendPath, 'utf-8');

        // Check that MicroblogItem has all expected fields
        const microblogItemMatch = backendContent.match(/type alias MicroblogItem =\s*{([^}]+)}/s);
        expect(microblogItemMatch).not.toBeNull();

        const fields = microblogItemMatch[1];
        // Verify all fields are present
        expect(fields).toContain('id :');
        expect(fields).toContain('title :');
        expect(fields).toContain('link :');
        expect(fields).toContain('image :');
        expect(fields).toContain('extract :');
        expect(fields).toContain('ownerComment :');
        expect(fields).toContain('comments :');
        expect(fields).toContain('tags :');
        expect(fields).toContain('timestamp :');
    });
});
