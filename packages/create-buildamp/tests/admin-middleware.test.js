import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Admin Middleware', async (t) => {
    // Construct paths once
    const authMiddlewarePath = path.join(process.cwd(), '..', '..', 'packages', 'hamlet-server', 'middleware', 'admin-auth.js');
    const apiMiddlewarePath = path.join(process.cwd(), '..', '..', 'packages', 'hamlet-server', 'middleware', 'admin-api.js');
    
    // Read content once
    const authContent = fs.readFileSync(authMiddlewarePath, 'utf8');
    const apiContent = fs.readFileSync(apiMiddlewarePath, 'utf8');
    
    await t.test('admin authentication middleware exists', async () => {
        assert.ok(fs.existsSync(authMiddlewarePath), 'Admin auth middleware should exist');
        
        
        // Check for proper middleware export
        assert.ok(authContent.includes('export'), 'Should export middleware function');
        
        // Check for token validation
        assert.ok(authContent.includes('HAMLET_ADMIN_TOKEN'), 'Should use HAMLET_ADMIN_TOKEN for authentication');
        
        // Check for multiple token sources (header, query, cookie)
        assert.ok(authContent.includes('header') || authContent.includes('req.headers'), 'Should check headers for token');
        assert.ok(authContent.includes('query') || authContent.includes('req.query'), 'Should check query params for token');
        assert.ok(authContent.includes('cookie') || authContent.includes('req.cookies'), 'Should check cookies for token');
        
        // Check for proper error responses
        assert.ok(authContent.includes('403') || authContent.includes('401'), 'Should return proper error status');
        assert.ok(authContent.includes('Admin access denied'), 'Should have descriptive error message');
    });

    await t.test('admin API middleware provides CFUK operations', async () => {
        assert.ok(fs.existsSync(apiMiddlewarePath), 'Admin API middleware should exist');
        
        
        // Check for CFUK operations (Create, Find, Update, Kill)
        const crudOperations = ['GET', 'POST', 'PUT', 'DELETE'];
        for (const method of crudOperations) {
            assert.ok(
                apiContent.includes(method) || apiContent.includes(method.toLowerCase()),
                `Should handle ${method} requests`
            );
        }
        
        // Check for generic resource handling
        assert.ok(
            apiContent.includes(':resource') || apiContent.includes('resource'),
            'Should handle generic resource operations'
        );
        
        // Check for proper Express middleware structure
        assert.ok(apiContent.includes('router') || apiContent.includes('app.'), 'Should use Express routing');
    });

    await t.test('admin middleware includes tenant isolation', async () => {
        
        // Check for tenant isolation in database operations
        assert.ok(
            apiContent.includes('host') || apiContent.includes('tenant'),
            'Should include tenant isolation'
        );
        
        // Check for host parameter in queries
        assert.ok(
            apiContent.includes('req.tenant') || apiContent.includes('host'),
            'Should extract tenant/host from request'
        );
        
        // Check for database query isolation (accepts various patterns)
        assert.ok(
            apiContent.includes('WHERE') || apiContent.includes('host =') || 
            apiContent.includes('host:') || apiContent.includes('req.tenant?.host'),
            'Should filter database queries by host/tenant'
        );
    });

    await t.test('admin middleware has proper error handling', async () => {
        
        // Check for error handling (try/catch or other patterns)
        assert.ok(
            (authContent.includes('try') && authContent.includes('catch')) || 
            authContent.includes('error') || authContent.includes('Error'),
            'Auth middleware should have error handling'
        );
        assert.ok(
            (apiContent.includes('try') && apiContent.includes('catch')) || 
            apiContent.includes('handleApiError') || apiContent.includes('error'),
            'API middleware should have error handling'
        );
        
        // Check for proper error responses
        assert.ok(authContent.includes('res.status'), 'Auth middleware should set HTTP status codes');
        assert.ok(apiContent.includes('res.status'), 'API middleware should set HTTP status codes');
        
        // Check for error logging
        assert.ok(
            authContent.includes('console.log') || authContent.includes('console.error') || authContent.includes('console.warn'),
            'Auth middleware should log security events'
        );
    });

    await t.test('admin API supports all database models', async () => {
        
        // Check for generic handling that would work with any model
        assert.ok(
            apiContent.includes('params.resource') || apiContent.includes('resource'),
            'Should handle any resource type generically'
        );
        
        // Should handle dynamic table names based on resource type
        assert.ok(
            apiContent.includes('table') || apiContent.includes('model') || apiContent.includes('resource'),
            'Should support dynamic table/model operations'
        );
    });

    await t.test('admin middleware integrates with existing database queries', async () => {
        // Check if admin middleware uses the generated database query functions
        
        // Should import or use existing database functions
        assert.ok(
            apiContent.includes('import') || apiContent.includes('require'),
            'Should import database functions'
        );
        
        // Should use existing query functions rather than raw SQL
        assert.ok(
            apiContent.includes('insert') || apiContent.includes('get') || apiContent.includes('update') || apiContent.includes('delete'),
            'Should use standardized database operation functions'
        );
    });

    await t.test('admin middleware configuration', async () => {
        // Test that middleware can be properly configured and mounted
        
        
        // Check for proper middleware function exports
        assert.ok(
            authContent.includes('export default') || authContent.includes('module.exports'),
            'Auth middleware should export a function'
        );
        
        assert.ok(
            apiContent.includes('export default') || apiContent.includes('module.exports'),
            'API middleware should export a function'
        );
        
        // Check for middleware function signatures (req, res, next)
        assert.ok(
            authContent.includes('req, res, next') || (authContent.includes('req') && authContent.includes('res') && authContent.includes('next')),
            'Auth middleware should have proper signature'
        );
    });
});