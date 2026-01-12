import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Hamlet's elm-rs codec generation via API calls
 *
 * These tests require a running server. They verify that generated
 * encoders/decoders work correctly at runtime.
 * We use Horatio's server as the test subject.
 */

describe('Hamlet Elm-RS Codec API Tests (tested via Horatio)', () => {
    let serverProcess;
    const testPort = 3004;
    const serverUrl = `http://localhost:${testPort}`;

    // Path to Horatio from hamlet-server test location
    const horatioServer = path.join(__dirname, '../../../../app/horatio/server');

    beforeAll(async () => {
        // Start Horatio's server as our test subject
        serverProcess = spawn('node', ['server.js'], {
            cwd: horatioServer,
            env: { ...process.env, PORT: testPort },
            stdio: 'inherit'
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 4000));
    });

    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    });

    test('round-trip encoding/decoding works with real data', async () => {
        // Test that data survives encode → decode cycle
        // This proves the generated encoders/decoders work at runtime

        // Use an existing item ID from the feed
        const feedResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({});

        expect(feedResponse.status).toBe(200);
        expect(feedResponse.body).toHaveProperty('items');
        expect(feedResponse.body.items.length).toBeGreaterThan(0);
        const existingItemId = feedResponse.body.items[0].id;

        const testComment = {
            item_id: existingItemId,
            parent_id: null,
            text: "Test comment with special chars: 'quotes' and émojis 🎉",
            author_name: "Test User"
        };

        const response = await request(serverUrl)
            .post('/api/SubmitComment')
            .send(testComment);

        // The fact that we get a 200 response means:
        // 1. Request was decoded successfully by Elm
        // 2. Handler processed it
        // 3. Response was encoded successfully
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('comment');
        expect(response.body.comment).toHaveProperty('id');
        expect(response.body.comment).toHaveProperty('text', testComment.text);
    });

    test('complex nested types work correctly', async () => {
        // GetFeed returns nested structures with lists
        const response = await request(serverUrl)
            .post('/api/GetFeed')
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('items');
        expect(Array.isArray(response.body.items)).toBe(true);

        if (response.body.items.length > 0) {
            const item = response.body.items[0];
            // Verify nested structure decoded correctly
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('title');
            expect(item).toHaveProperty('timestamp');

            // These fields use RichContent type
            expect(typeof item.extract).toBe('string');
            expect(typeof item.owner_comment).toBe('string');
        }
    });
});
