describe('KV Store Generation - Basic Tests', () => {
    test('KV store file exists and has correct structure', () => {
        const fs = require('fs');
        const path = require('path');
        
        const kvFile = path.join(__dirname, '../../generated/kv-store.js');
        
        expect(fs.existsSync(kvFile)).toBe(true);
        
        const content = fs.readFileSync(kvFile, 'utf-8');
        
        // Check main export
        expect(content).toContain('export default function createKvFunctions');
        
        // Check TestCache functions
        expect(content).toContain('setTestCache');
        expect(content).toContain('getTestCache');
        expect(content).toContain('deleteTestCache');
        expect(content).toContain('existsTestCache');
        expect(content).toContain('updateTtlTestCache');
        
        // Check UserSession functions
        expect(content).toContain('setUserSession');
        expect(content).toContain('getUserSession');
        expect(content).toContain('deleteUserSession');
        expect(content).toContain('existsUserSession');
        expect(content).toContain('updateTtlUserSession');
        
        // Check tenant isolation
        expect(content).toContain('host}:testcache:');
        expect(content).toContain('host}:usersession:');
        
        // Check helper functions
        expect(content).toContain('cleanupExpiredKeys');
        expect(content).toContain('getTenantKeys');
    });

    test('KV functions use correct Redis operations', () => {
        const fs = require('fs');
        const path = require('path');
        
        const kvFile = path.join(__dirname, '../../generated/kv-store.js');
        const content = fs.readFileSync(kvFile, 'utf-8');
        
        // Check Redis operations are used
        expect(content).toContain('kvClient.setex');
        expect(content).toContain('kvClient.get');
        expect(content).toContain('kvClient.del');
        expect(content).toContain('kvClient.exists');
        expect(content).toContain('kvClient.expire');
        
        // Check TTL handling
        expect(content).toContain('ttl || 3600'); // Default TTL
        expect(content).toContain('JSON.stringify');
        expect(content).toContain('JSON.parse');
    });

    test('error handling is implemented', () => {
        const fs = require('fs');
        const path = require('path');
        
        const kvFile = path.join(__dirname, '../../generated/kv-store.js');
        const content = fs.readFileSync(kvFile, 'utf-8');
        
        // Check try-catch blocks
        expect(content).toContain('try {');
        expect(content).toContain('} catch (error) {');
        expect(content).toContain('console.error');
        
        // Check return values for errors
        expect(content).toContain('return false');
        expect(content).toContain('return null');
    });
});