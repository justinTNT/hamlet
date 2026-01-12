import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { spawn } from 'child_process';

/**
 * Test to reproduce TEA handler state corruption bug
 * 
 * The bug: After first successful GetFeed request, subsequent requests return 
 * wrong data (tags instead of microblog_items) due to handler stage state 
 * persisting between requests and causing subscription channel mismatch.
 */

describe('TEA Handler State Corruption', () => {
    let serverProcess;
    const testPort = 3001;  // Unique port for state corruption test
    const serverUrl = `http://localhost:${testPort}`;
    
    beforeAll(async () => {
        // Start the server with custom port
        serverProcess = spawn('node', ['server.js'], {
            cwd: '/Users/jtnt/Play/hamlet/app/horatio/server',
            env: { ...process.env, PORT: testPort },
            stdio: 'inherit'
        });
        
        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));
    });
    
    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            // Give it time to shut down gracefully
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    });

    test('should return consistent data across multiple requests', async () => {
        // Make first request to GetFeed
        const firstResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({})
            .expect(200);
        
        console.log('First response:', JSON.stringify(firstResponse.body, null, 2));
        
        // Validate first response structure
        expect(firstResponse.body).toHaveProperty('items');
        expect(Array.isArray(firstResponse.body.items)).toBe(true);
        
        // If we have items, validate they have microblog_item structure
        if (firstResponse.body.items.length > 0) {
            const firstItem = firstResponse.body.items[0];
            expect(firstItem).toHaveProperty('title');
            expect(firstItem).toHaveProperty('image');
            expect(firstItem).toHaveProperty('extract');
            expect(firstItem).toHaveProperty('owner_comment');
            
            // Should NOT have tag-only structure (id, name, created_at)
            expect(firstItem).not.toMatchObject({
                id: expect.any(String),
                name: expect.any(String),
                created_at: expect.any(Number)
            });
        }

        // Make second request immediately - this should trigger the bug
        const secondResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({})
            .expect(200);
            
        console.log('Second response:', JSON.stringify(secondResponse.body, null, 2));
        
        // Validate second response has same structure as first
        expect(secondResponse.body).toHaveProperty('items');
        expect(Array.isArray(secondResponse.body.items)).toBe(true);
        
        // This is where the bug manifests: second response returns tag data instead of item data
        if (secondResponse.body.items.length > 0) {
            const secondItem = secondResponse.body.items[0];
            
            // Should have microblog_item structure
            expect(secondItem).toHaveProperty('title');
            expect(secondItem).toHaveProperty('image');
            expect(secondItem).toHaveProperty('extract');
            expect(secondItem).toHaveProperty('owner_comment');
            
            // Should NOT have tag structure (this will fail when bug is present)
            expect(secondItem).not.toMatchObject({
                id: expect.any(String),
                name: expect.any(String),
                created_at: expect.any(Number)
            });
        }

        // Make third request to confirm persistence of corruption
        const thirdResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({})
            .expect(200);
            
        console.log('Third response:', JSON.stringify(thirdResponse.body, null, 2));
        
        // All responses should have identical structure
        expect(firstResponse.body.items).toEqual(secondResponse.body.items);
        expect(secondResponse.body.items).toEqual(thirdResponse.body.items);
    }, 30000);

    test('should handle concurrent requests without state corruption', async () => {
        // Make multiple concurrent requests
        const requests = Array(5).fill().map(() => 
            request(serverUrl)
                .post('/api/GetFeed')
                .send({})
        );
        
        const responses = await Promise.all(requests);
        
        // All responses should be successful
        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
        });
        
        // All responses should have identical structure
        const firstResponseItems = responses[0].body.items;
        responses.slice(1).forEach(response => {
            expect(response.body.items).toEqual(firstResponseItems);
        });
    }, 30000);
});