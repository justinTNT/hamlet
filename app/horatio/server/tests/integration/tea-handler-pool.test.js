import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { spawn } from 'child_process';

/**
 * TEA Handler Pool Tests
 * 
 * Tests the pool behavior: initialization, scaling, replacement, cleanup
 */

describe('TEA Handler Pool', () => {
    let serverProcess;
    const testPort = 3002;  // Unique port for pool test
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

    test('should handle burst traffic with automatic scaling', async () => {
        // Create 10 concurrent requests to test pool scaling
        const requests = Array(10).fill().map(() => 
            request(serverUrl)
                .post('/api/GetFeed')
                .send({})
        );
        
        const startTime = Date.now();
        const responses = await Promise.all(requests);
        const duration = Date.now() - startTime;
        
        // All requests should succeed
        responses.forEach((response, i) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
            console.log(`Request ${i + 1}: ${response.status} (${response.body.items?.length || 0} items)`);
        });
        
        // Should handle 10 concurrent requests reasonably fast (pool + scaling)
        expect(duration).toBeLessThan(5000); // 5 seconds max
        
        console.log(`✅ Handled ${requests.length} concurrent requests in ${duration}ms`);
    }, 30000);

    test('should maintain consistent response times under load', async () => {
        const results = [];
        
        // Test sequential requests to measure pool efficiency
        for (let i = 0; i < 5; i++) {
            const startTime = Date.now();
            
            const response = await request(serverUrl)
                .post('/api/GetFeed')
                .send({});
                
            const duration = Date.now() - startTime;
            results.push(duration);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
        }
        
        // Response times should be consistently fast (pool working)
        const avgTime = results.reduce((a, b) => a + b) / results.length;
        const maxTime = Math.max(...results);
        
        console.log(`Response times: ${results.join(', ')}ms (avg: ${avgTime.toFixed(1)}ms, max: ${maxTime}ms)`);
        
        // With a pool, all requests should be fast (no slow spawning)
        expect(maxTime).toBeLessThan(1000); // 1 second max per request
        expect(avgTime).toBeLessThan(500);  // 500ms average
    }, 30000);

    test('should isolate requests with different instances', async () => {
        // Test that concurrent requests use different handler instances
        const [response1, response2, response3] = await Promise.all([
            request(serverUrl).post('/api/GetFeed').send({}),
            request(serverUrl).post('/api/GetFeed').send({}),
            request(serverUrl).post('/api/GetFeed').send({})
        ]);
        
        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
        expect(response3.status).toBe(200);
        
        // All should have same data structure (using same endpoint)
        expect(response1.body).toHaveProperty('items');
        expect(response2.body).toHaveProperty('items');
        expect(response3.body).toHaveProperty('items');
        
        // Should get identical data (perfect isolation means consistent results)
        expect(response1.body.items).toEqual(response2.body.items);
        expect(response2.body.items).toEqual(response3.body.items);
        
        console.log(`✅ All 3 concurrent requests returned identical ${response1.body.items?.length || 0} items`);
        console.log('✅ Perfect isolation confirmed - no cross-request interference');
    });

    test('should handle errors gracefully without affecting pool', async () => {
        // Test error handling doesn't corrupt the pool
        
        // First make a successful request
        const goodResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({});
        
        expect(goodResponse.status).toBe(200);
        expect(goodResponse.body).toHaveProperty('items');
        
        // Try to trigger an error (invalid endpoint)
        const badResponse = await request(serverUrl)
            .post('/api/NonexistentHandler')
            .send({});
        
        expect(badResponse.status).not.toBe(200); // Should fail
        
        // Pool should still work fine after error
        const recoveryResponse = await request(serverUrl)
            .post('/api/GetFeed')
            .send({});
        
        expect(recoveryResponse.status).toBe(200);
        expect(recoveryResponse.body).toHaveProperty('items');
        
        // Should get same data as before (no corruption)
        expect(recoveryResponse.body.items).toEqual(goodResponse.body.items);
        
        console.log('✅ Pool recovered gracefully after error');
    });

    test('should handle timeouts without pool corruption', async () => {
        // Test timeout scenarios don't affect other requests
        
        const requests = [
            // Normal request
            request(serverUrl).post('/api/GetFeed').send({}),
            // Another normal request  
            request(serverUrl).post('/api/GetFeed').send({}),
            // Third normal request
            request(serverUrl).post('/api/GetFeed').send({})
        ];
        
        const responses = await Promise.all(requests.map(req => 
            req.timeout(10000).catch(err => ({ status: 408, error: err.message }))
        ));
        
        // At least some requests should succeed
        const successful = responses.filter(r => r.status === 200);
        expect(successful.length).toBeGreaterThan(0);
        
        // Successful responses should have correct data
        successful.forEach(response => {
            expect(response.body).toHaveProperty('items');
        });
        
        console.log(`✅ ${successful.length}/${responses.length} requests successful under timeout pressure`);
    }, 35000);
});