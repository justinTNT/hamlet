import { HamletServer } from '../index.js';
import request from 'supertest';

describe('Hamlet Server Core', () => {
    test('server can be created with minimal config', () => {
        const server = new HamletServer({ 
            port: 0,
            features: { kv: false, sse: false }
        });
        
        expect(server).toBeDefined();
        expect(server.app).toBeDefined();
        expect(server.config.port).toBe(0);
    });
    
    test('middleware loader detects features correctly', () => {
        const server = new HamletServer({ 
            features: { kv: true, sse: false }
        });

        const features = server.loader.detectFeatures();
        expect(features.hasKeyValueStore).toBe(true);
        expect(features.hasServerSentEvents).toBe(false);
    });
    
    test('health endpoint works without starting server', async () => {
        const server = new HamletServer({ 
            port: 0,
            features: { kv: false, sse: false }
        });
        
        // Load middleware synchronously for test
        await server.loader.loadRequiredMiddleware();
        
        const response = await request(server.app)
            .get('/health')
            .expect(200);
            
        expect(response.body).toMatchObject({
            status: 'ok',
            features: expect.any(Array),
            timestamp: expect.any(String)
        });
        
        await server.stop();
    });
});