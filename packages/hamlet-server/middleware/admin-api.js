/**
 * Admin API Middleware
 * 
 * Exposes a generic CRUD interface for Admin UI.
 * PROTECTED by HAMLET_ADMIN_TOKEN (if set) or development-only.
 */

import createAdminAuth from './admin-auth.js';

export default function createAdminApi(server) {
    console.log('👷 Setting up Admin API...');

    // Get the database service
    const db = server.getService('database');
    if (!db) {
        console.warn('⚠️ Admin API skipped: Database service not available');
        return;
    }

    // Use the shared admin authentication middleware
    const requireAdmin = createAdminAuth();

    // Generic endpoints
    
    // List all resources
    server.app.get('/admin/api/:resource', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource; // e.g., "Guest"
            // Extract host and remove port number if present
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host'); 
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            // Dynamic method call: getGuestsByHost (map resource names to method names)
            const resourceToMethodName = {
                'guest': 'Guest',
                'item_comment': 'ItemComment', 
                'item_tag': 'ItemTag',
                'microblog_item': 'MicroblogItem',
                'tag': 'Tag'
            };
            
            const methodResource = resourceToMethodName[resource];
            if (!methodResource) {
                return res.status(404).json({ error: `Unknown resource '${resource}'` });
            }
            
            // Try soft delete-aware method first, fallback to original
            let methodName = `find${methodResource}sByHost`;
            if (typeof db[methodName] !== 'function') {
                methodName = `get${methodResource}sByHost`;
            }

            if (typeof db[methodName] === 'function') {
                const results = await db[methodName](host);
                
                // Remove the host field from each result (internal tenant field)
                const cleanResults = results.map(item => {
                    const { host, ...cleanItem } = item;
                    return cleanItem;
                });
                
                res.json(cleanResults);
            } else {
                res.status(404).json({ error: `Resource '${resource}' not found or not listable` });
            }
        } catch (error) {
            console.error('Admin list error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Get single resource by ID
    server.app.get('/admin/api/:resource/:id', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource;
            const id = req.params.id;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host'); 
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            const resourceToMethodName = {
                'guest': 'Guest',
                'item_comment': 'ItemComment', 
                'item_tag': 'ItemTag',
                'microblog_item': 'MicroblogItem',
                'tag': 'Tag'
            };
            
            const methodResource = resourceToMethodName[resource];
            if (!methodResource) {
                return res.status(404).json({ error: `Unknown resource '${resource}'` });
            }
            
            // Try soft delete-aware method first, fallback to original
            let methodName = `find${methodResource}ById`;
            if (typeof db[methodName] !== 'function') {
                methodName = `get${methodResource}ById`;
            }

            if (typeof db[methodName] === 'function') {
                const result = await db[methodName](id, host);
                
                if (!result) {
                    return res.status(404).json({ error: `${methodResource} not found` });
                }
                
                // Remove the host field from result
                const { host: _, ...cleanResult } = result;
                res.json(cleanResult);
            } else {
                res.status(404).json({ error: `Resource '${resource}' not found or not readable` });
            }
        } catch (error) {
            console.error('Admin get error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Handle "new" route - return empty form template
    server.app.get('/admin/api/:resource/new', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource;
            
            const resourceToMethodName = {
                'guest': 'Guest',
                'item_comment': 'ItemComment', 
                'item_tag': 'ItemTag',
                'microblog_item': 'MicroblogItem',
                'tag': 'Tag'
            };
            
            const methodResource = resourceToMethodName[resource];
            if (!methodResource) {
                return res.status(404).json({ error: `Unknown resource '${resource}'` });
            }

            // Return empty template for new resource
            res.json({ 
                resource: methodResource,
                isNew: true,
                data: {}
            });
        } catch (error) {
            console.error('Admin new error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Create new resource (POST)
    server.app.post('/admin/api/:resource', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host'); 
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';
            const data = req.body;
            
            console.log('🔍 Create Debug - rawHost:', rawHost);
            console.log('🔍 Create Debug - host:', host);
            console.log('🔍 Create Debug - data:', data);

            const resourceToMethodName = {
                'guest': 'Guest',
                'item_comment': 'ItemComment', 
                'item_tag': 'ItemTag',
                'microblog_item': 'MicroblogItem',
                'tag': 'Tag'
            };
            
            const methodResource = resourceToMethodName[resource];
            if (!methodResource) {
                return res.status(404).json({ error: `Unknown resource '${resource}'` });
            }
            
            const methodName = `create${methodResource}`;

            if (typeof db[methodName] === 'function') {
                // Remove host from form data to avoid duplication, then add it back
                const { host: _, ...cleanData } = data;
                const result = await db[methodName]({ ...cleanData, host });
                
                // Remove the host field from result
                const { host: __, ...cleanResult } = result;
                res.status(201).json(cleanResult);
            } else {
                res.status(404).json({ error: `Resource '${resource}' not creatable` });
            }
        } catch (error) {
            console.error('Admin create error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Update resource (PUT)
    server.app.put('/admin/api/:resource/:id', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource;
            const id = req.params.id;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host'); 
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';
            const data = req.body;
            
            console.log('🔍 Update Debug - rawHost:', rawHost);
            console.log('🔍 Update Debug - host:', host);
            console.log('🔍 Update Debug - data:', data);

            const resourceToMethodName = {
                'guest': 'Guest',
                'item_comment': 'ItemComment', 
                'item_tag': 'ItemTag',
                'microblog_item': 'MicroblogItem',
                'tag': 'Tag'
            };
            
            const methodResource = resourceToMethodName[resource];
            if (!methodResource) {
                return res.status(404).json({ error: `Unknown resource '${resource}'` });
            }
            
            const methodName = `update${methodResource}`;

            if (typeof db[methodName] === 'function') {
                // Remove host from form data to avoid duplication, then add it back
                const { host: _, ...cleanData } = data;
                const result = await db[methodName](id, { ...cleanData, host });
                
                if (!result) {
                    return res.status(404).json({ error: `${methodResource} not found` });
                }
                
                // Remove the host field from result
                const { host: __, ...cleanResult } = result;
                res.json(cleanResult);
            } else {
                res.status(404).json({ error: `Resource '${resource}' not updatable` });
            }
        } catch (error) {
            console.error('Admin update error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Delete resource (DELETE)
    server.app.delete('/admin/api/:resource/:id', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource;
            const id = req.params.id;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host'); 
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            const resourceToMethodName = {
                'guest': 'Guest',
                'item_comment': 'ItemComment', 
                'item_tag': 'ItemTag',
                'microblog_item': 'MicroblogItem',
                'tag': 'Tag'
            };
            
            const methodResource = resourceToMethodName[resource];
            if (!methodResource) {
                return res.status(404).json({ error: `Unknown resource '${resource}'` });
            }
            
            // Use soft delete (kill) method instead of hard delete
            const methodName = `kill${methodResource}`;

            if (typeof db[methodName] === 'function') {
                const result = await db[methodName](id, host);
                
                if (!result) {
                    return res.status(404).json({ error: `${methodResource} not found` });
                }
                
                res.status(204).send(); // No content for successful delete
            } else {
                res.status(404).json({ error: `Resource '${resource}' not killable` });
            }
        } catch (error) {
            console.error('Admin delete error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    console.log('✅ Admin API CRUD endpoints mounted at /admin/api/:resource');
}