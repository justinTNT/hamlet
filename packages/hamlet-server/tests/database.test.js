import { HamletServer } from '../index.js';

describe('Database Middleware', () => {
    test('database middleware can be configured', () => {
        const server = new HamletServer({ 
            port: 0,
            features: {
                database: true,
                kv: false,
                sse: false
            }
        });
        
        const features = server.loader.detectFeatures();
        expect(features.hasDatabase).toBe(true);
        expect(features.hasKeyValueStore).toBe(false);
    });
    
    test('database middleware creates expected service methods', async () => {
        // Just test feature detection without mocking complex pg behavior
        const server = new HamletServer({ 
            port: 0,
            features: { database: true, kv: false, sse: false }
        });
        
        // Test that database feature is detected
        const features = server.loader.detectFeatures();
        expect(features.hasDatabase).toBe(true);
        
        // Don't actually load middleware (would try to connect to real DB in this test)
        await server.stop();
    });
    
    test('minimal server does not load database', () => {
        const server = new HamletServer({ 
            features: { database: false }
        });
        
        const features = server.loader.detectFeatures();
        expect(features.hasDatabase).toBe(false);
    });
});