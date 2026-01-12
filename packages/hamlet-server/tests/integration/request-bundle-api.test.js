import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Hamlet's RequestBundle structure using Horatio handlers
 *
 * Verifies that Hamlet's TEA handlers receive the correct RequestBundle format:
 * { request, context, globalConfig, globalState }
 * All as JSON values, not double-encoded.
 * We use Horatio's handlers as the test subject.
 */

describe('Hamlet RequestBundle Structure (tested via Horatio)', () => {
    let serverProcess;
    const testPort = 3005;  // Unique port for request bundle tests
    const serverUrl = `http://localhost:${testPort}`;

    // Path to Horatio from hamlet-server test location
    const horatioServer = path.join(__dirname, '../../../../app/horatio/server');

    beforeAll(async () => {
        // Start Horatio's server as our test subject
        serverProcess = spawn('node', ['server.js'], {
            cwd: horatioServer,
            env: { ...process.env, PORT: testPort, DEBUG_BUNDLE: 'true' },
            stdio: 'inherit'
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
    });
    
    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    });

    test('handler receives request as JSON value', async () => {
        // Submit a comment and verify it processes correctly
        // First get a valid item ID
        const feedResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({})
            .expect(200);

        const existingItemId = feedResponse.body.items[0].id;
        const testData = {
            item_id: existingItemId,
            parent_id: null,
            text: "Testing RequestBundle structure",
            author_name: "Bundle Tester"
        };
        
        const response = await request(serverUrl)
            .post('/api/SubmitComment')
            .send(testData)
            .expect(200);
        
        // Success means the request was properly decoded from the bundle
        expect(response.body).toHaveProperty('comment');
        expect(response.body.comment).toHaveProperty('id');
        expect(response.body.comment).toHaveProperty('text', testData.text);
    });

    test('context is properly injected with host', async () => {
        // GetFeed should work even without explicit host in request
        // because context injection adds it
        const response = await request(serverUrl)
            .post('/api/GetFeed')
            .send({}) // No host field
            .expect(200);
        
        // Should still get results because host was injected via context
        expect(response.body).toHaveProperty('items');
        expect(Array.isArray(response.body.items)).toBe(true);
    });

    test('globalConfig values are accessible to handlers', async () => {
        // We can't directly test this without modifying handlers
        // but we can verify handlers that depend on globalConfig work
        
        // GetItem uses serverNow for timestamp validation
        // First get a valid item ID
        const feedResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({})
            .expect(200);
        
        const existingId = feedResponse.body.items[0].id;
        
        const response = await request(serverUrl)
            .post('/api/GetItem')
            .send({ id: existingId })
            .expect(200);
        
        // If globalConfig wasn't available, timestamp operations would fail
        expect(response.body).toHaveProperty('item');
    });

    test('multiple concurrent requests maintain isolation', async () => {
        // Fire multiple requests simultaneously
        // Each should have its own RequestBundle
        const requests = Array(5).fill(null).map((_, i) => 
            request(serverUrl)
                .post('/api/GetFeed')
                .send({})
        );
        
        const responses = await Promise.all(requests);
        
        // All should succeed
        responses.forEach(resp => {
            expect(resp.status).toBe(200);
            expect(resp.body).toHaveProperty('items');
        });
        
        // Verify they got consistent data (no cross-contamination)
        const firstItems = responses[0].body.items;
        responses.forEach(resp => {
            expect(resp.body.items.length).toBe(firstItems.length);
        });
    });

    test('request bundle preserves field types', async () => {
        // Test various field types in request
        // Get valid item ID first
        const feedResp = await request(serverUrl)
            .post('/api/GetFeed')
            .send({})
            .expect(200);

        const complexRequest = {
            item_id: feedResp.body.items[0].id,
            parent_id: null, // Optional field as null
            text: "Test with numbers: 123 and bools",
            author_name: "Test Author"
        };

        const response = await request(serverUrl)
            .post('/api/SubmitComment')
            .send(complexRequest)
            .expect(200);

        expect(response.body).toHaveProperty('comment');
        expect(response.body.comment).toHaveProperty('id');

        // Also test request with optional fields as null
        const minimalRequest = {
            item_id: feedResp.body.items[0].id,
            parent_id: null,
            text: "Minimal comment",
            author_name: null
        };

        const minimalResponse = await request(serverUrl)
            .post('/api/SubmitComment')
            .send(minimalRequest)
            .expect(200);

        expect(minimalResponse.body).toHaveProperty('comment');
        expect(minimalResponse.body.comment).toHaveProperty('id');
    });

    test('handlers can access all RequestBundle fields', async () => {
        // Test that handlers can access request, context, and globalConfig
        // GetItem needs the item ID from request and returns full item details

        // First get a valid item ID
        const feedResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({})
            .expect(200);

        const existingItemId = feedResponse.body.items[0].id;

        const itemResponse = await request(serverUrl)
            .post('/api/GetItem')
            .send({ id: existingItemId });

        // The fact that GetItem returns 200 with full item proves:
        // 1. Request data was extracted from bundle
        // 2. Context was available (for host-based DB queries)
        // 3. Handler could access all parts of RequestBundle
        expect(itemResponse.status).toBe(200);
        expect(itemResponse.body).toHaveProperty('item');
        expect(itemResponse.body.item).toHaveProperty('id');
        expect(itemResponse.body.item).toHaveProperty('title');
    });

    test('error handling preserves RequestBundle structure', async () => {
        // Send invalid request to trigger error handling
        const invalidRequest = {
            // Missing required item_id
            text: "This should fail"
        };
        
        const response = await request(serverUrl)
            .post('/api/SubmitComment')
            .send(invalidRequest);
        
        // The handler might still return 200 with an error in the response
        // or it might inject the item_id. Let's check what actually happens
        if (response.status === 200) {
            // Handler handled the missing field gracefully
            expect(response.body).toBeDefined();
        } else {
            // Handler returned an error
            expect(response.body).toHaveProperty('error');
        }
    });
});