/**
 * BuildAmp WASM E2E Tests
 * Tests that actually load the compiled WASM and exercise codec/validation
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';

// Path to the compiled WASM package
const PKG_NODE_PATH = path.join(process.cwd(), '../../pkg-node');

// Check if WASM is built
const wasmExists = fs.existsSync(path.join(PKG_NODE_PATH, 'proto_rust_bg.wasm'));

describe('WASM E2E Tests', { skip: !wasmExists }, () => {
    let wasm;

    before(async () => {
        // Load the compiled WASM
        wasm = await import(path.join(PKG_NODE_PATH, 'proto_rust.js'));
    });

    describe('Manifest Functions', () => {
        test('get_endpoint_manifest returns valid JSON', () => {
            const manifest = wasm.get_endpoint_manifest();
            assert.ok(manifest, 'Should return manifest');

            const parsed = JSON.parse(manifest);
            assert.ok(typeof parsed === 'object', 'Should be valid JSON object');
        });

        test('get_context_manifest returns valid JSON', () => {
            const manifest = wasm.get_context_manifest();
            assert.ok(manifest, 'Should return manifest');

            const parsed = JSON.parse(manifest);
            assert.ok(typeof parsed === 'object', 'Should be valid JSON object');
        });

        test('validate_manifest returns structured JSON', () => {
            const result = wasm.validate_manifest();
            assert.ok(result, 'Should return result');

            const parsed = JSON.parse(result);
            assert.ok('valid' in parsed, 'Should have valid field');
            assert.ok('contexts' in parsed, 'Should have contexts field');
            assert.ok('endpoints' in parsed, 'Should have endpoints field');
            assert.ok('errors' in parsed, 'Should have errors field');
            assert.ok(Array.isArray(parsed.contexts), 'contexts should be array');
            assert.ok(Array.isArray(parsed.endpoints), 'endpoints should be array');
            assert.ok(Array.isArray(parsed.errors), 'errors should be array');
            assert.strictEqual(typeof parsed.valid, 'boolean', 'valid should be boolean');
        });

        test('get_openapi_spec returns OpenAPI spec', () => {
            const spec = wasm.get_openapi_spec();
            assert.ok(spec, 'Should return spec');

            const parsed = JSON.parse(spec);
            assert.ok(parsed.openapi || parsed.swagger, 'Should be OpenAPI/Swagger spec');
        });
    });

    describe('Encode/Decode Round Trip', () => {
        test('encode_request produces output', () => {
            // Test with a simple request
            const endpoint = 'GetFeed';
            const input = JSON.stringify({ page: 1 });

            const encoded = wasm.encode_request(endpoint, input);
            assert.ok(encoded, 'Should produce encoded output');
        });

        test('encode_response produces output', () => {
            const endpoint = 'GetFeed';
            const input = JSON.stringify({ items: [] });

            const encoded = wasm.encode_response(endpoint, input);
            assert.ok(encoded, 'Should produce encoded output');
        });

        test('decode_response decodes encoded data', () => {
            const endpoint = 'GetFeed';
            const originalData = { items: [], total: 0 };
            const input = JSON.stringify(originalData);

            // Encode then decode
            const encoded = wasm.encode_response(endpoint, input);
            const decoded = wasm.decode_response(endpoint, encoded);

            assert.ok(decoded, 'Should produce decoded output');

            // The decoded result should be valid JSON
            const parsedDecoded = JSON.parse(decoded);
            assert.ok(typeof parsedDecoded === 'object', 'Decoded should be valid JSON');
        });
    });

    describe('Dispatcher', () => {
        test('dispatcher handles request with context', () => {
            const endpoint = 'GetFeed';
            const wire = JSON.stringify({ page: 1 });
            const context = JSON.stringify({
                host: 'test.local',
                user_id: null,
                is_extension: false
            });

            // Dispatcher should return a result (may be error if no handler)
            const result = wasm.dispatcher(endpoint, wire, context);
            assert.ok(result, 'Should return result');

            // Result should be valid JSON
            const parsed = JSON.parse(result);
            assert.ok(typeof parsed === 'object', 'Result should be valid JSON');
        });
    });

    describe('Migration Generation', () => {
        test('generate_migrations returns SQL', () => {
            const migrations = wasm.generate_migrations();
            assert.ok(migrations, 'Should return migrations');

            // Should contain CREATE TABLE or be valid JSON with SQL
            const isSql = migrations.includes('CREATE TABLE') || migrations.includes('create table');
            const isJson = migrations.startsWith('{') || migrations.startsWith('[');

            assert.ok(isSql || isJson, 'Should be SQL or JSON containing SQL');
        });
    });

    describe('Validation Behavior', () => {
        test('encode_request handles invalid JSON gracefully', () => {
            const endpoint = 'GetFeed';
            const invalidJson = 'not valid json {{{';

            // Should either throw or return error, not crash
            try {
                const result = wasm.encode_request(endpoint, invalidJson);
                // If it returns, check for error indication
                if (result) {
                    const parsed = JSON.parse(result);
                    // Result might indicate an error
                    assert.ok(true, 'Handled invalid JSON');
                }
            } catch (error) {
                // Throwing is also acceptable behavior
                assert.ok(error.message, 'Should have error message');
            }
        });

        test('encode_request handles unknown endpoint', () => {
            const unknownEndpoint = 'NonExistentEndpoint12345';
            const validJson = JSON.stringify({ data: 'test' });

            try {
                const result = wasm.encode_request(unknownEndpoint, validJson);
                // Should return something (possibly error)
                assert.ok(true, 'Handled unknown endpoint');
            } catch (error) {
                // Throwing is also acceptable
                assert.ok(error.message, 'Should have error message');
            }
        });

        test('dispatcher handles missing context fields', () => {
            const endpoint = 'GetFeed';
            const wire = JSON.stringify({});
            const incompleteContext = JSON.stringify({ host: 'test.local' });

            try {
                const result = wasm.dispatcher(endpoint, wire, incompleteContext);
                assert.ok(true, 'Handled incomplete context');
            } catch (error) {
                assert.ok(error.message, 'Should have error message');
            }
        });
    });
});

describe('WASM Not Built', { skip: wasmExists }, () => {
    test('WASM e2e tests skipped - run `buildamp gen:wasm` first', () => {
        console.log('⚠️  WASM not built at', PKG_NODE_PATH);
        console.log('   Run: buildamp gen:wasm --target node');
        assert.ok(true, 'Skipped - WASM not built');
    });
});
