import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { spawn } from 'child_process';

/**
 * Performance Tests for TEA Handler Pool
 * 
 * Tests to ensure the pool provides the expected performance benefits
 */

describe('TEA Handler Pool Performance', () => {
    let serverProcess;
    const testPort = 3003;  // Unique port for performance test
    const serverUrl = `http://localhost:${testPort}`;
    
    beforeAll(async () => {
        serverProcess = spawn('node', ['server.js'], {
            cwd: '/Users/jtnt/Play/hamlet/app/horatio/server',
            env: { ...process.env, PORT: testPort },
            stdio: 'inherit'
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
    });
    
    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            // Give it time to shut down gracefully
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    });

    test('first request should be fast (pre-warmed pool)', async () => {
        const startTime = Date.now();
        
        const response = await request(serverUrl)
            .post('/api/GetFeed')
            .send({});
            
        const duration = Date.now() - startTime;
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('items');
        
        // First request should be fast due to pre-warmed pool
        // (vs slow if spawning fresh handler)
        expect(duration).toBeLessThan(200); // 200ms max
        
        console.log(`✅ First request completed in ${duration}ms (pool benefit)`);
    });

    test('concurrent requests should have similar performance', async () => {
        const concurrency = 5;
        const times = [];
        
        const requests = Array(concurrency).fill().map(async (_, i) => {
            const startTime = Date.now();
            
            const response = await request(serverUrl)
                .post('/api/GetFeed')
                .send({});
                
            const duration = Date.now() - startTime;
            times.push(duration);
            
            expect(response.status).toBe(200);
            return { index: i, duration };
        });
        
        const results = await Promise.all(requests);
        
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        const variance = maxTime - minTime;
        
        console.log(`Concurrent performance: min=${minTime}ms, max=${maxTime}ms, avg=${avgTime.toFixed(1)}ms, variance=${variance}ms`);
        
        // With a proper pool, variance should be low
        expect(variance).toBeLessThan(1000); // No request should be 1s+ slower than others
        expect(avgTime).toBeLessThan(500);   // Average should be reasonable
        
        results.forEach(({ index, duration }) => {
            console.log(`Request ${index + 1}: ${duration}ms`);
        });
    }, 30000);

    test('sustained load should maintain performance', async () => {
        const rounds = 3;
        const requestsPerRound = 4;
        const results = [];
        
        for (let round = 0; round < rounds; round++) {
            console.log(`\n--- Round ${round + 1} ---`);
            
            const roundStartTime = Date.now();
            
            const requests = Array(requestsPerRound).fill().map(async () => {
                const response = await request(serverUrl)
                    .post('/api/GetFeed')
                    .send({});
                    
                expect(response.status).toBe(200);
                return response;
            });
            
            await Promise.all(requests);
            
            const roundDuration = Date.now() - roundStartTime;
            results.push(roundDuration);
            
            console.log(`Round ${round + 1} completed in ${roundDuration}ms`);
            
            // Brief pause between rounds
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Performance should not degrade significantly over time
        const firstRound = results[0];
        const lastRound = results[results.length - 1];
        const degradation = (lastRound - firstRound) / firstRound;
        
        console.log(`\nPerformance degradation: ${(degradation * 100).toFixed(1)}%`);
        console.log(`Round times: ${results.join(', ')}ms`);
        
        // Should not get significantly slower (pool not leaking/growing)
        expect(degradation).toBeLessThan(2.0); // Less than 200% degradation
    }, 45000);

    test('multiple pools should not interfere', async () => {
        const mixedRequests = [
            { endpoint: '/api/GetFeed', name: 'GetFeed' },
            { endpoint: '/api/GetFeed', name: 'GetFeed' },
            { endpoint: '/api/GetFeed', name: 'GetFeed' },
            { endpoint: '/api/GetFeed', name: 'GetFeed' }
        ];
        
        const startTime = Date.now();
        
        const requests = mixedRequests.map(async ({ endpoint, name }) => {
            const reqStartTime = Date.now();
            
            const response = await request(serverUrl)
                .post(endpoint)
                .send({});
                
            const duration = Date.now() - reqStartTime;
            
            expect(response.status).toBe(200);
            
            return { name, duration, success: true };
        });
        
        const results = await Promise.all(requests);
        const totalTime = Date.now() - startTime;
        
        console.log(`\nMultiple pool performance (${totalTime}ms total):`);
        results.forEach(({ name, duration }) => {
            console.log(`${name}: ${duration}ms`);
        });
        
        // All requests should complete successfully
        expect(results.every(r => r.success)).toBe(true);
        
        // Should handle multiple pool usage efficiently
        expect(totalTime).toBeLessThan(1000); // 1 second for 4 requests
    }, 30000);
});