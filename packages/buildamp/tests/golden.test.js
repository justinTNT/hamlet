/**
 * Golden Snapshot Tests
 *
 * These tests compare current generator output against known-good "golden" snapshots.
 * Used to detect unintended regressions in generated code.
 *
 * To update golden snapshots after intentional changes:
 *   npm run test:update-golden
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const goldenDir = path.join(__dirname, 'golden');
const projectRoot = path.join(__dirname, '../../..');
const horatioDir = path.join(projectRoot, 'app/horatio');

// Paths to generated files
const generatedPaths = {
    // SQL
    'schema.sql': path.join(horatioDir, 'server/.generated/schema.sql'),
    'schema.json': path.join(horatioDir, 'server/.generated/schema.json'),
    // Database
    'database-queries.js': path.join(horatioDir, 'server/.generated/database-queries.js'),
    'Database.elm': path.join(horatioDir, 'server/.generated/BuildAmp/Database.elm'),
    'Api.elm': path.join(horatioDir, 'server/.generated/BuildAmp/Api.elm'),
    // API
    'api-routes.js': path.join(horatioDir, 'server/.generated/api-routes.js'),
    'ApiClient.elm': path.join(horatioDir, 'web/src/.generated/BuildAmp/ApiClient.elm'),
    // KV Store
    'kv-store.js': path.join(horatioDir, 'server/.generated/kv-store.js'),
    // SSE
    'sse-connection.js': path.join(horatioDir, 'server/.generated/sse-connection.js'),
    'ServerSentEvents.elm': path.join(horatioDir, 'web/src/.generated/BuildAmp/ServerSentEvents.elm'),
    // Browser Storage
    'browser-storage.js': path.join(horatioDir, 'web/src/.generated/browser-storage.js'),
    'StoragePorts.elm': path.join(horatioDir, 'web/src/.generated/StoragePorts.elm'),
};

/**
 * Normalize type syntax between Rust and Elm formats.
 * Rust: DatabaseId<String>, ForeignKey<MicroblogItem, String>, Option<String>
 * Elm:  DatabaseId String,  ForeignKey MicroblogItem String,  Maybe String
 *
 * Converts Rust syntax to Elm syntax for consistent comparison.
 */
function normalizeTypeSyntax(typeStr) {
    // Convert Option<T> to Maybe T
    let normalized = typeStr.replace(/Option<([^>]+)>/g, 'Maybe $1');

    // Convert GenericType<Arg> to GenericType Arg
    // Handle single type argument: DatabaseId<String> -> DatabaseId String
    normalized = normalized.replace(/(\w+)<(\w+)>/g, '$1 $2');

    // Handle two type arguments: ForeignKey<MicroblogItem, String> -> ForeignKey MicroblogItem String
    normalized = normalized.replace(/(\w+)<(\w+),\s*(\w+)>/g, '$1 $2 $3');

    return normalized;
}

/**
 * Normalize content for comparison:
 * - Remove timestamps and dates
 * - Normalize whitespace
 * - Remove file-specific comments that might change
 * - Normalize source file references (Rust vs Elm)
 */
function normalizeForComparison(content, filename) {
    let normalized = content;

    // Remove generation timestamps (common in generated files)
    normalized = normalized.replace(/Generated on:.*$/gm, 'Generated on: [TIMESTAMP]');
    // Normalize ISO timestamps including milliseconds
    normalized = normalized.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?/g, '[DATETIME]');
    normalized = normalized.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[DATETIME]');

    // Normalize source file references (Rust .rs -> Elm .elm migration)
    // SQL comments: -- Generated from guest.rs -> -- Generated from [SOURCE]
    normalized = normalized.replace(/-- Generated from \S+\.(rs|elm)/g, '-- Generated from [SOURCE]');
    // Elm comments: (Generated from guest.rs) or (Generated from Guest.elm) -> (Generated from [SOURCE])
    normalized = normalized.replace(/\(Generated from \S+\.(rs|elm)\)/g, '(Generated from [SOURCE])');

    // Normalize line endings
    normalized = normalized.replace(/\r\n/g, '\n');

    // For JSON, parse and re-stringify to normalize formatting
    if (filename.endsWith('.json')) {
        try {
            const parsed = JSON.parse(normalized);
            // Normalize sourceFile fields
            if (parsed.tables) {
                for (const table of Object.values(parsed.tables)) {
                    if (table.sourceFile) {
                        table.sourceFile = '[SOURCE]';
                    }
                    // Normalize rustType syntax (Rust uses <>, Elm uses spaces)
                    // Convert Rust angle bracket syntax to Elm space syntax for comparison
                    if (table.fields) {
                        for (const field of Object.values(table.fields)) {
                            if (field.rustType) {
                                field.rustType = normalizeTypeSyntax(field.rustType);
                            }
                        }
                    }
                }
            }
            normalized = JSON.stringify(parsed, null, 2);
        } catch (e) {
            // If not valid JSON, continue with string comparison
        }
    }

    return normalized;
}

/**
 * Compare two files and return a helpful diff message if different
 */
function compareFiles(goldenPath, currentPath, filename) {
    const goldenContent = fs.readFileSync(goldenPath, 'utf-8');
    const currentContent = fs.readFileSync(currentPath, 'utf-8');

    const normalizedGolden = normalizeForComparison(goldenContent, filename);
    const normalizedCurrent = normalizeForComparison(currentContent, filename);

    if (normalizedGolden !== normalizedCurrent) {
        // Find first differing line for helpful error message
        const goldenLines = normalizedGolden.split('\n');
        const currentLines = normalizedCurrent.split('\n');

        for (let i = 0; i < Math.max(goldenLines.length, currentLines.length); i++) {
            if (goldenLines[i] !== currentLines[i]) {
                return {
                    match: false,
                    message: `First difference at line ${i + 1}:\n` +
                        `  Golden:  ${goldenLines[i] || '(end of file)'}\n` +
                        `  Current: ${currentLines[i] || '(end of file)'}`
                };
            }
        }

        return { match: false, message: 'Files differ in length' };
    }

    return { match: true };
}

describe('Golden Snapshot Tests', () => {

    describe('SQL Schema', () => {
        test('schema.sql matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'schema.sql');
            const currentPath = generatedPaths['schema.sql'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'schema.sql');
            assert.ok(result.match, `schema.sql differs from golden:\n${result.message}`);
        });

        test('schema.sql contains all expected tables', () => {
            const content = fs.readFileSync(generatedPaths['schema.sql'], 'utf-8');

            const expectedTables = [
                'guest',
                'microblog_item',
                'tag',
                'item_comment',
                'item_tag'
            ];

            for (const table of expectedTables) {
                assert.ok(
                    content.includes(`CREATE TABLE ${table}`),
                    `Should contain CREATE TABLE ${table}`
                );
            }
        });

        test('schema.sql has correct foreign keys', () => {
            const content = fs.readFileSync(generatedPaths['schema.sql'], 'utf-8');

            // item_comment should reference microblog_item
            assert.ok(
                content.includes('FOREIGN KEY (item_id) REFERENCES microblog_item(id)'),
                'item_comment should have FK to microblog_item'
            );

            // item_tag should reference both microblog_item and tag
            assert.ok(
                content.includes('FOREIGN KEY (item_id) REFERENCES microblog_item(id)'),
                'item_tag should have FK to microblog_item'
            );
            assert.ok(
                content.includes('FOREIGN KEY (tag_id) REFERENCES tag(id)'),
                'item_tag should have FK to tag'
            );
        });
    });

    describe('Schema Introspection', () => {
        test('schema.json matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'schema.json');
            const currentPath = generatedPaths['schema.json'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'schema.json');
            assert.ok(result.match, `schema.json differs from golden:\n${result.message}`);
        });

        test('schema.json has correct structure', () => {
            const content = fs.readFileSync(generatedPaths['schema.json'], 'utf-8');
            const schema = JSON.parse(content);

            assert.ok(schema.tables, 'Should have tables property');
            assert.ok(schema.tables.microblog_item, 'Should have microblog_item table');
            assert.ok(schema.tables.tag, 'Should have tag table');
            assert.ok(schema.tables.item_tag, 'Should have item_tag table');

            // Verify join table detection
            assert.ok(
                schema.tables.item_tag.isJoinTable === true,
                'item_tag should be marked as join table'
            );
        });
    });

    describe('Database Queries', () => {
        test('database-queries.js matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'database-queries.js');
            const currentPath = generatedPaths['database-queries.js'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'database-queries.js');
            assert.ok(result.match, `database-queries.js differs from golden:\n${result.message}`);
        });

        test('database-queries.js exports expected functions', () => {
            const content = fs.readFileSync(generatedPaths['database-queries.js'], 'utf-8');

            // Should have CRUD functions for each model
            const expectedFunctions = [
                'insertMicroblogItem',
                'getMicroblogItemById',
                'getMicroblogItemsByHost',
                'updateMicroblogItem',
                'killMicroblogItem',
                'insertTag',
                'getTagById',
            ];

            for (const fn of expectedFunctions) {
                assert.ok(
                    content.includes(`export async function ${fn}`) ||
                    content.includes(`async function ${fn}`),
                    `Should export ${fn}`
                );
            }
        });
    });

    describe('Elm Database Module', () => {
        test('Database.elm matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'Database.elm');
            const currentPath = generatedPaths['Database.elm'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'Database.elm');
            assert.ok(result.match, `Database.elm differs from golden:\n${result.message}`);
        });
    });

    describe('BuildAmp.Api Backend Types', () => {
        test('Api.elm matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'Api.elm');
            const currentPath = generatedPaths['Api.elm'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'Api.elm');
            assert.ok(result.match, `Api.elm differs from golden:\n${result.message}`);
        });

        test('Api.elm has expected types and codecs', () => {
            const content = fs.readFileSync(generatedPaths['Api.elm'], 'utf-8');

            // Module declaration
            assert.ok(content.includes('module BuildAmp.Api exposing'), 'Should have correct module name');

            // Types
            assert.ok(content.includes('type alias MicroblogItem ='), 'Should have MicroblogItem type');
            assert.ok(content.includes('type alias FeedItem ='), 'Should have FeedItem type');
            assert.ok(content.includes('type alias GetFeedReq ='), 'Should have GetFeedReq type');

            // Encoders
            assert.ok(content.includes('microblogItemEncoder :'), 'Should have encoder');

            // Decoders
            assert.ok(content.includes('microblogItemDecoder :'), 'Should have decoder');
        });
    });

    describe('API Routes', () => {
        test('api-routes.js matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'api-routes.js');
            const currentPath = generatedPaths['api-routes.js'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'api-routes.js');
            assert.ok(result.match, `api-routes.js differs from golden:\n${result.message}`);
        });

        test('api-routes.js has route registration', () => {
            const content = fs.readFileSync(generatedPaths['api-routes.js'], 'utf-8');

            // Should export route registration function
            assert.ok(
                content.includes('export function registerApiRoutes') ||
                content.includes('function registerApiRoutes'),
                'Should have registerApiRoutes function'
            );

            // Should have route handlers
            assert.ok(content.includes('app.get') || content.includes('app.post'), 'Should register routes');
        });
    });

    describe('API Client Elm', () => {
        test('ApiClient.elm matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'ApiClient.elm');
            const currentPath = generatedPaths['ApiClient.elm'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'ApiClient.elm');
            assert.ok(result.match, `ApiClient.elm differs from golden:\n${result.message}`);
        });

        test('ApiClient.elm has expected structure', () => {
            const content = fs.readFileSync(generatedPaths['ApiClient.elm'], 'utf-8');

            // Module declaration (BuildAmp.ApiClient)
            assert.ok(content.includes('module') && content.includes('ApiClient'), 'Should have module declaration');

            // HTTP functions
            assert.ok(content.includes('Http.'), 'Should use Http module');
        });
    });

    describe('KV Store', () => {
        test('kv-store.js matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'kv-store.js');
            const currentPath = generatedPaths['kv-store.js'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'kv-store.js');
            assert.ok(result.match, `kv-store.js differs from golden:\n${result.message}`);
        });

        test('kv-store.js has expected functions', () => {
            const content = fs.readFileSync(generatedPaths['kv-store.js'], 'utf-8');

            // Should have get/set functions
            assert.ok(
                content.includes('export async function') || content.includes('async function'),
                'Should have async functions for KV operations'
            );
        });
    });

    describe('SSE Connection', () => {
        test('sse-connection.js matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'sse-connection.js');
            const currentPath = generatedPaths['sse-connection.js'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'sse-connection.js');
            assert.ok(result.match, `sse-connection.js differs from golden:\n${result.message}`);
        });

        test('sse-connection.js has SSE setup', () => {
            const content = fs.readFileSync(generatedPaths['sse-connection.js'], 'utf-8');

            // Should have SSE-related content
            assert.ok(
                content.includes('text/event-stream') || content.includes('EventSource'),
                'Should have SSE setup'
            );
        });
    });

    describe('SSE Client Elm', () => {
        test('ServerSentEvents.elm matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'ServerSentEvents.elm');
            const currentPath = generatedPaths['ServerSentEvents.elm'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'ServerSentEvents.elm');
            assert.ok(result.match, `ServerSentEvents.elm differs from golden:\n${result.message}`);
        });

        test('ServerSentEvents.elm has expected structure', () => {
            const content = fs.readFileSync(generatedPaths['ServerSentEvents.elm'], 'utf-8');

            // Module declaration (BuildAmp.ServerSentEvents)
            assert.ok(content.includes('module') && content.includes('ServerSentEvents'), 'Should have module declaration');

            // Type definitions or decoders for SSE events
            assert.ok(content.includes('Decode') || content.includes('type alias'), 'Should have types or decoders');
        });
    });

    describe('Browser Storage', () => {
        test('browser-storage.js matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'browser-storage.js');
            const currentPath = generatedPaths['browser-storage.js'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'browser-storage.js');
            assert.ok(result.match, `browser-storage.js differs from golden:\n${result.message}`);
        });

        test('browser-storage.js has localStorage operations', () => {
            const content = fs.readFileSync(generatedPaths['browser-storage.js'], 'utf-8');

            // Should have localStorage operations
            assert.ok(
                content.includes('localStorage') || content.includes('sessionStorage'),
                'Should have storage operations'
            );
        });
    });

    describe('Storage Ports Elm', () => {
        test('StoragePorts.elm matches golden snapshot', () => {
            const goldenPath = path.join(goldenDir, 'StoragePorts.elm');
            const currentPath = generatedPaths['StoragePorts.elm'];

            assert.ok(fs.existsSync(goldenPath), 'Golden snapshot should exist');
            assert.ok(fs.existsSync(currentPath), 'Generated file should exist');

            const result = compareFiles(goldenPath, currentPath, 'StoragePorts.elm');
            assert.ok(result.match, `StoragePorts.elm differs from golden:\n${result.message}`);
        });

        test('StoragePorts.elm has expected structure', () => {
            const content = fs.readFileSync(generatedPaths['StoragePorts.elm'], 'utf-8');

            // Module declaration
            assert.ok(content.includes('module StoragePorts'), 'Should have module declaration');

            // Port declarations
            assert.ok(content.includes('port '), 'Should have port declarations');
        });
    });
});

describe('Golden Snapshot Utilities', () => {
    test('all golden files exist', () => {
        const expectedFiles = [
            // SQL
            'schema.sql',
            'schema.json',
            // Database
            'database-queries.js',
            'Database.elm',
            'Api.elm',
            // API
            'api-routes.js',
            'ApiClient.elm',
            // KV Store
            'kv-store.js',
            // SSE
            'sse-connection.js',
            'ServerSentEvents.elm',
            // Browser Storage
            'browser-storage.js',
            'StoragePorts.elm'
        ];

        for (const file of expectedFiles) {
            const goldenPath = path.join(goldenDir, file);
            assert.ok(fs.existsSync(goldenPath), `Golden file ${file} should exist`);
        }
    });

    test('all generated files exist', () => {
        for (const [name, filePath] of Object.entries(generatedPaths)) {
            assert.ok(fs.existsSync(filePath), `Generated file ${name} should exist at ${filePath}`);
        }
    });
});
