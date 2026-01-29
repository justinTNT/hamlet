/**
 * Admin API Middleware
 *
 * Exposes a generic CRUD interface for Admin UI.
 * PROTECTED by HAMLET_PROJECT_KEY via auth-resolver (projectAdmin tier).
 */

import createAdminAuth from './admin-auth.js';

/**
 * Convert snake_case resource name to PascalCase method name
 * e.g., 'item_comment' -> 'ItemComment'
 */
function snakeToPascal(str) {
    return str.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

// ============================================================================
// Condition Evaluation (exported for testing)
// ============================================================================

/**
 * Evaluate a Value expression (Const or Field)
 * @param {Object} value - The value expression
 * @param {Object|null} before - The row before the operation
 * @param {Object|null} after - The row after the operation
 * @returns {string|null} The evaluated value
 */
export function evaluateValue(value, before, after) {
    if (!value) return null;

    switch (value.type) {
        case 'Const':
            return value.value;

        case 'Field': {
            const row = value.ref === 'Before' ? before : after;
            if (!row) return null;
            const fieldValue = row[value.field];
            // Convert to string for comparison (matches Elm's behavior)
            return fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : null;
        }

        default:
            console.warn(`Unknown value type: ${value.type}`);
            return null;
    }
}

/**
 * Evaluate a condition expression against before/after rows
 * @param {Object} condition - The condition expression
 * @param {Object|null} before - The row before the operation
 * @param {Object|null} after - The row after the operation
 * @returns {boolean} True if condition is satisfied
 */
export function evaluateCondition(condition, before, after) {
    if (!condition) return true; // No condition = always fire

    switch (condition.type) {
        case 'Eq':
            return evaluateValue(condition.left, before, after) === evaluateValue(condition.right, before, after);

        case 'Neq':
            return evaluateValue(condition.left, before, after) !== evaluateValue(condition.right, before, after);

        case 'IsNull': {
            const row = condition.ref === 'Before' ? before : after;
            return row === null || row[condition.field] === null || row[condition.field] === undefined;
        }

        case 'IsNotNull': {
            const row = condition.ref === 'Before' ? before : after;
            return row !== null && row[condition.field] !== null && row[condition.field] !== undefined;
        }

        case 'And':
            return evaluateCondition(condition.left, before, after) && evaluateCondition(condition.right, before, after);

        case 'Or':
            return evaluateCondition(condition.left, before, after) || evaluateCondition(condition.right, before, after);

        default:
            console.warn(`Unknown condition type: ${condition.type}`);
            return false;
    }
}

export default function createAdminApi(server) {
    console.log('👷 Setting up Admin API...');

    // Get the shared database service (framework-level queries)
    const db = server.getService('database');
    if (!db) {
        console.warn('⚠️ Admin API skipped: Database service not available');
        return;
    }

    /**
     * Resolve the project-scoped database service for a request.
     * Falls back to the shared db if project-loader isn't available.
     */
    function getProjectDb(req) {
        const projectLoader = server.getService('project-loader');
        if (projectLoader && typeof projectLoader.getProxy === 'function' && req.project) {
            const proxy = projectLoader.getProxy(req.project);
            if (proxy) {
                return proxy.getService('database') || db;
            }
        }
        return db;
    }

    // Use the shared admin authentication middleware
    const requireAdmin = createAdminAuth(server.config?.projectKeys || {});

    // ========================================================================
    // Host Key Management — /_keys routes
    // ========================================================================

    // List active keys for the current host
    server.app.get('/admin/api/_keys', requireAdmin, async (req, res) => {
        try {
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            const result = await db.query(
                `SELECT id, target_host, key, label, created_at, revoked_at
                 FROM hamlet_host_keys
                 WHERE target_host = $1
                 ORDER BY created_at DESC`,
                [host]
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Admin _keys list error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Create a new host key
    server.app.post('/admin/api/_keys', requireAdmin, async (req, res) => {
        try {
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';
            const { label } = req.body || {};

            const result = await db.query(
                `INSERT INTO hamlet_host_keys (target_host, key, label)
                 VALUES ($1, gen_random_uuid()::text, $2)
                 RETURNING id, target_host, key, label, created_at`,
                [host, label || null]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Admin _keys create error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Revoke a host key (soft-delete via revoked_at)
    server.app.delete('/admin/api/_keys/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            const result = await db.query(
                `UPDATE hamlet_host_keys
                 SET revoked_at = NOW()
                 WHERE id = $1 AND target_host = $2 AND revoked_at IS NULL
                 RETURNING id`,
                [id, host]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Key not found or already revoked' });
            }

            res.status(204).send();
        } catch (error) {
            console.error('Admin _keys revoke error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ========================================================================
    // Host Mapping Management — /_hosts routes
    // ========================================================================

    // List all hostname->project mappings
    server.app.get('/admin/api/_hosts', requireAdmin, async (req, res) => {
        try {
            const result = await db.query(
                `SELECT id, hostname, project, created_at
                 FROM hamlet_hosts
                 ORDER BY created_at DESC`
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Admin _hosts list error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Create a new host mapping
    server.app.post('/admin/api/_hosts', requireAdmin, async (req, res) => {
        try {
            const { hostname, project } = req.body || {};

            if (!hostname || !project) {
                return res.status(400).json({ error: 'hostname and project are required' });
            }

            // Validate project exists in loaded projects
            const projectLoader = server.getService('project-loader');
            if (projectLoader && !projectLoader.hasProject(project)) {
                return res.status(400).json({ error: `Project '${project}' is not loaded` });
            }

            const result = await db.query(
                `INSERT INTO hamlet_hosts (hostname, project)
                 VALUES ($1, $2)
                 RETURNING id, hostname, project, created_at`,
                [hostname, project]
            );

            // Invalidate host-resolver cache
            const hostResolver = server.getService('host-resolver');
            if (hostResolver) {
                await hostResolver.invalidate(hostname);
            }

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Admin _hosts create error:', error);
            if (error.code === '23505') { // unique violation
                return res.status(409).json({ error: `Hostname '${req.body.hostname}' already mapped` });
            }
            res.status(500).json({ error: error.message });
        }
    });

    // Delete a host mapping
    server.app.delete('/admin/api/_hosts/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;

            // Fetch the hostname before deleting (for cache invalidation)
            const existing = await db.query(
                'SELECT hostname FROM hamlet_hosts WHERE id = $1',
                [id]
            );

            const result = await db.query(
                'DELETE FROM hamlet_hosts WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Host mapping not found' });
            }

            // Invalidate host-resolver cache
            const hostResolver = server.getService('host-resolver');
            if (hostResolver && existing.rows.length > 0) {
                await hostResolver.invalidate(existing.rows[0].hostname);
            }

            res.status(204).send();
        } catch (error) {
            console.error('Admin _hosts delete error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Schema endpoint - MUST come before generic /:resource routes
    server.app.get('/admin/api/schema', requireAdmin, async (req, res) => {
        try {
            const schema = await loadSchema(req.project);
            if (schema) {
                return res.json(schema);
            }
            res.status(404).json({ error: 'schema.json not found' });
        } catch (error) {
            console.error('Admin schema error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Per-project caches for schema and admin hooks
    const schemaCache = new Map();
    const hooksCache = new Map();

    // Helper to load admin hooks (per-project)
    const loadAdminHooks = async (projectName) => {
        const cacheKey = projectName || '_default';
        if (hooksCache.has(cacheKey)) return hooksCache.get(cacheKey);

        const fs = await import('fs');
        const path = await import('path');
        const appName = projectName || server.config?.application || 'horatio';

        const possiblePaths = [
            path.join(process.cwd(), 'server', '.generated', 'admin-hooks.json'),
            path.join(process.cwd(), '.generated', 'admin-hooks.json'),
            path.join(process.cwd(), 'app', appName, 'server', '.generated', 'admin-hooks.json')
        ];

        for (const hooksPath of possiblePaths) {
            if (fs.existsSync(hooksPath)) {
                const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
                hooksCache.set(cacheKey, hooks);
                return hooks;
            }
        }
        return null;
    };

    /**
     * Publish admin hook event with before/after payload
     */
    const publishHookEvent = async (hook, before, after, host) => {
        try {
            // Build payload with before/after row data
            const eventPayload = {
                before: before || null,
                after: after || null
            };

            await db.query(
                `INSERT INTO buildamp_events (host, event_type, payload, status, created_at)
                 VALUES ($1, $2, $3, 'pending', NOW())`,
                [host, hook.event, JSON.stringify(eventPayload)]
            );

            console.log(`📣 Admin hook triggered: ${hook.event} (${hook.trigger}) for ${hook.table}`);
        } catch (error) {
            console.error('Failed to publish admin hook event:', error);
        }
    };

    // Helper to load schema (per-project)
    const loadSchema = async (projectName) => {
        const cacheKey = projectName || '_default';
        if (schemaCache.has(cacheKey)) return schemaCache.get(cacheKey);

        const fs = await import('fs');
        const path = await import('path');
        const appName = projectName || server.config?.application || 'horatio';

        const possiblePaths = [
            path.join(process.cwd(), 'server', '.generated', 'schema.json'),
            path.join(process.cwd(), '.generated', 'schema.json'),
            path.join(process.cwd(), 'app', appName, 'server', '.generated', 'schema.json')
        ];

        for (const schemaPath of possiblePaths) {
            if (fs.existsSync(schemaPath)) {
                const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                schemaCache.set(cacheKey, schema);
                return schema;
            }
        }
        return null;
    };

    /**
     * Build WHERE clause based on schema MultiTenant/SoftDelete flags
     * Returns { whereClause, params, nextParamIndex }
     */
    const buildSchemaAwareWhereClause = (tableSchema, host) => {
        // Determine field names from schema, with defaults for backward compat
        const tenantField = tableSchema?.multiTenantFieldName || 'host';
        const deletedField = tableSchema?.softDeleteFieldName || 'deleted_at';

        const conditions = [];
        const params = [];
        let nextParamIndex = 1;

        // MultiTenant filtering: apply if schema says so, OR fallback if no schema (backward compat)
        if (!tableSchema || tableSchema.isMultiTenant !== false) {
            conditions.push(`${tenantField} = $${nextParamIndex}`);
            params.push(host);
            nextParamIndex++;
        }

        // SoftDelete filtering: apply if schema says so, OR fallback if no schema (backward compat)
        if (!tableSchema || tableSchema.isSoftDelete !== false) {
            conditions.push(`${deletedField} IS NULL`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return { whereClause, params, nextParamIndex, tenantField };
    };

    /**
     * Normalize request data based on schema:
     * - Convert empty strings to null for nullable fields
     */
    const normalizeRequestData = (data, tableSchema) => {
        if (!tableSchema || !tableSchema.fields) {
            return data;
        }

        const normalized = { ...data };
        for (const [fieldName, fieldSchema] of Object.entries(tableSchema.fields)) {
            if (fieldSchema.nullable && normalized[fieldName] === '') {
                normalized[fieldName] = null;
            }
        }
        return normalized;
    };

    // Options endpoint - returns id/label pairs for FK dropdowns
    // GET /admin/api/:resource/options
    server.app.get('/admin/api/:resource/options', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';
            const pdb = getProjectDb(req);

            const methodResource = snakeToPascal(resource);

            // Try soft delete-aware method first, fallback to original
            let methodName = `find${methodResource}sByHost`;
            if (typeof pdb[methodName] !== 'function') {
                methodName = `get${methodResource}sByHost`;
            }

            if (typeof pdb[methodName] === 'function') {
                const results = await pdb[methodName](host);
                // Return id and a display label (prefer name, title, or id)
                const options = results.map(item => ({
                    id: item.id,
                    label: item.name || item.title || item.email || item.id
                }));
                res.json(options);
            } else {
                res.status(404).json({ error: `Resource '${resource}' not found` });
            }
        } catch (error) {
            console.error('Admin options error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Generic endpoints

    // List all resources with server-side sorting and pagination
    server.app.get('/admin/api/:resource', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource; // e.g., "guest" or "microblog_item"
            // Extract host and remove port number if present
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            // Parse query params for sorting and pagination
            const sortField = req.query.sort || 'created_at';
            const sortDir = (req.query.dir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            const offset = parseInt(req.query.offset, 10) || 0;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500); // Cap at 500

            // Validate sort field to prevent SQL injection (only allow alphanumeric and underscore)
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortField)) {
                return res.status(400).json({ error: 'Invalid sort field' });
            }

            // Load schema for schema-aware query building
            const schema = await loadSchema(req.project);
            const tableSchema = schema?.tables?.[resource];
            const { whereClause, params, nextParamIndex, tenantField } = buildSchemaAwareWhereClause(tableSchema, host);

            // Build SQL query with sorting and pagination
            const dataQuery = `
                SELECT * FROM ${resource}
                ${whereClause}
                ORDER BY ${sortField} ${sortDir}
                LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}
            `;
            const countQuery = `
                SELECT COUNT(*) as total FROM ${resource}
                ${whereClause}
            `;

            // Execute both queries
            const [dataResult, countResult] = await Promise.all([
                db.query(dataQuery, [...params, limit, offset]),
                db.query(countQuery, params)
            ]);

            // Remove the tenant field from each result (internal tenant field)
            const cleanResults = dataResult.rows.map(item => {
                const { [tenantField]: _, ...cleanItem } = item;
                return cleanItem;
            });

            res.json({
                data: cleanResults,
                total: parseInt(countResult.rows[0].total, 10),
                offset,
                limit
            });
        } catch (error) {
            console.error('Admin list error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Get related records for a resource
    // GET /admin/api/:resource/:id/related/:relatedTable
    server.app.get('/admin/api/:resource/:id/related/:relatedTable', requireAdmin, async (req, res) => {
        try {
            const { resource, id, relatedTable } = req.params;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            const schema = await loadSchema(req.project);
            if (!schema) {
                return res.status(500).json({ error: 'Schema not found' });
            }

            // Find the FK column in the related table that references this resource
            const relatedTableSchema = schema.tables[relatedTable];
            if (!relatedTableSchema) {
                return res.status(400).json({ error: `Related table '${relatedTable}' not found` });
            }

            const fk = relatedTableSchema.foreignKeys?.find(
                fk => fk.references.table === resource
            );

            if (!fk) {
                return res.status(400).json({ error: `No relationship from '${relatedTable}' to '${resource}'` });
            }

            // Query related records using the FK column
            const pdb = getProjectDb(req);
            const methodResource = snakeToPascal(relatedTable);
            let methodName = `find${methodResource}sByHost`;
            if (typeof pdb[methodName] !== 'function') {
                methodName = `get${methodResource}sByHost`;
            }

            if (typeof pdb[methodName] === 'function') {
                const allRecords = await pdb[methodName](host);
                // Filter to records where the FK matches our id
                const relatedRecords = allRecords.filter(record => record[fk.column] === id);

                const cleanResults = relatedRecords.map(item => {
                    const { host, ...cleanItem } = item;
                    return cleanItem;
                });

                res.json(cleanResults);
            } else {
                res.status(404).json({ error: `Related table '${relatedTable}' not queryable` });
            }
        } catch (error) {
            console.error('Admin related records error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Many-to-many: Get linked IDs
    // GET /admin/api/:resource/:id/m2m/:relatedTable
    server.app.get('/admin/api/:resource/:id/m2m/:relatedTable', requireAdmin, async (req, res) => {
        try {
            const { resource, id, relatedTable } = req.params;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            const schema = await loadSchema(req.project);
            if (!schema) {
                return res.status(500).json({ error: 'Schema not found' });
            }

            // Find the M2M relationship
            const m2m = schema.manyToManyRelationships?.find(
                r => (r.table1 === resource && r.table2 === relatedTable) ||
                     (r.table2 === resource && r.table1 === relatedTable)
            );

            if (!m2m) {
                return res.status(400).json({ error: `No many-to-many relationship between '${resource}' and '${relatedTable}'` });
            }

            // Find which FK columns to use
            const joinTableSchema = schema.tables[m2m.joinTable];
            if (!joinTableSchema) {
                return res.status(500).json({ error: `Join table '${m2m.joinTable}' not found in schema` });
            }

            const resourceFk = joinTableSchema.foreignKeys.find(fk => fk.references.table === resource);
            const relatedFk = joinTableSchema.foreignKeys.find(fk => fk.references.table === relatedTable);

            if (!resourceFk || !relatedFk) {
                return res.status(500).json({ error: 'Could not determine FK columns' });
            }

            // Query the join table
            const pdb = getProjectDb(req);
            const methodResource = snakeToPascal(m2m.joinTable);
            let methodName = `find${methodResource}sByHost`;
            if (typeof pdb[methodName] !== 'function') {
                methodName = `get${methodResource}sByHost`;
            }

            if (typeof pdb[methodName] === 'function') {
                const allJoinRecords = await pdb[methodName](host);
                // Filter to records matching our resource ID and extract related IDs
                const linkedIds = allJoinRecords
                    .filter(record => record[resourceFk.column] === id)
                    .map(record => record[relatedFk.column]);

                res.json({ linkedIds });
            } else {
                res.status(404).json({ error: `Join table '${m2m.joinTable}' not queryable` });
            }
        } catch (error) {
            console.error('Admin M2M get error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Many-to-many: Set linked IDs (replace all)
    // PUT /admin/api/:resource/:id/m2m/:relatedTable
    server.app.put('/admin/api/:resource/:id/m2m/:relatedTable', requireAdmin, async (req, res) => {
        try {
            const { resource, id, relatedTable } = req.params;
            const { linkedIds } = req.body; // Array of IDs to link
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';

            if (!Array.isArray(linkedIds)) {
                return res.status(400).json({ error: 'linkedIds must be an array' });
            }

            const schema = await loadSchema(req.project);
            if (!schema) {
                return res.status(500).json({ error: 'Schema not found' });
            }

            // Find the M2M relationship
            const m2m = schema.manyToManyRelationships?.find(
                r => (r.table1 === resource && r.table2 === relatedTable) ||
                     (r.table2 === resource && r.table1 === relatedTable)
            );

            if (!m2m) {
                return res.status(400).json({ error: `No many-to-many relationship between '${resource}' and '${relatedTable}'` });
            }

            // Find which FK columns to use
            const joinTableSchema = schema.tables[m2m.joinTable];
            if (!joinTableSchema) {
                return res.status(500).json({ error: `Join table '${m2m.joinTable}' not found in schema` });
            }

            const resourceFk = joinTableSchema.foreignKeys.find(fk => fk.references.table === resource);
            const relatedFk = joinTableSchema.foreignKeys.find(fk => fk.references.table === relatedTable);

            if (!resourceFk || !relatedFk) {
                return res.status(500).json({ error: 'Could not determine FK columns' });
            }

            const pdb = getProjectDb(req);
            const methodResource = snakeToPascal(m2m.joinTable);

            // Get existing join records
            let findMethodName = `find${methodResource}sByHost`;
            if (typeof pdb[findMethodName] !== 'function') {
                findMethodName = `get${methodResource}sByHost`;
            }

            if (typeof pdb[findMethodName] !== 'function') {
                return res.status(404).json({ error: `Join table '${m2m.joinTable}' not queryable` });
            }

            const allJoinRecords = await pdb[findMethodName](host);
            const existingJoinRecords = allJoinRecords.filter(record => record[resourceFk.column] === id);
            const existingLinkedIds = existingJoinRecords.map(record => record[relatedFk.column]);

            // Determine which to add and which to remove
            const toAdd = linkedIds.filter(lid => !existingLinkedIds.includes(lid));
            const toRemove = existingLinkedIds.filter(lid => !linkedIds.includes(lid));

            // Remove unlinked records (soft delete)
            const killMethodName = `kill${methodResource}`;
            if (typeof pdb[killMethodName] === 'function' && toRemove.length > 0) {
                for (const removeId of toRemove) {
                    const recordToRemove = existingJoinRecords.find(r => r[relatedFk.column] === removeId);
                    if (recordToRemove && recordToRemove.id) {
                        await pdb[killMethodName](recordToRemove.id, host);
                    }
                }
            }

            // Add new linked records
            const createMethodName = `create${methodResource}`;
            if (typeof pdb[createMethodName] === 'function' && toAdd.length > 0) {
                for (const addId of toAdd) {
                    await pdb[createMethodName]({
                        [resourceFk.column]: id,
                        [relatedFk.column]: addId,
                        host
                    });
                }
            }

            res.json({ linkedIds, added: toAdd.length, removed: toRemove.length });
        } catch (error) {
            console.error('Admin M2M set error:', error);
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
            const pdb = getProjectDb(req);

            // Convert snake_case resource to PascalCase for method dispatch
            const methodResource = snakeToPascal(resource);

            // Try soft delete-aware method first, fallback to original
            let methodName = `find${methodResource}ById`;
            if (typeof pdb[methodName] !== 'function') {
                methodName = `get${methodResource}ById`;
            }

            if (typeof pdb[methodName] === 'function') {
                const result = await pdb[methodName](id, host);
                
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
            
            // Convert snake_case resource to PascalCase for method dispatch
            const methodResource = snakeToPascal(resource);

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

            // Load schema for data normalization
            const schema = await loadSchema(req.project);
            const tableSchema = schema?.tables?.[resource];

            // Convert snake_case resource to PascalCase for method dispatch
            const pdb = getProjectDb(req);
            const methodResource = snakeToPascal(resource);
            const methodName = `create${methodResource}`;

            if (typeof pdb[methodName] === 'function') {
                // Remove host from form data, normalize, then add host back
                const { host: _, ...cleanData } = data;
                const normalizedData = normalizeRequestData(cleanData, tableSchema);
                const result = await pdb[methodName]({ ...normalizedData, host });

                // Check OnInsert admin hooks
                const adminHooks = await loadAdminHooks(req.project);
                const insertHooks = adminHooks?.hooks?.filter(h => h.table === resource && h.trigger === 'OnInsert') || [];

                for (const hook of insertHooks) {
                    // Evaluate condition with before=null, after=result
                    if (evaluateCondition(hook.condition, null, result)) {
                        await publishHookEvent(hook, null, result, host);
                    }
                }

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

            // Load schema for data normalization
            const schema = await loadSchema(req.project);
            const tableSchema = schema?.tables?.[resource];

            // Convert snake_case resource to PascalCase for method dispatch
            const methodResource = snakeToPascal(resource);
            const methodName = `update${methodResource}`;
            const getMethodName = `find${methodResource}ById`;
            const altGetMethodName = `get${methodResource}ById`;

            const pdb = getProjectDb(req);
            if (typeof pdb[methodName] === 'function') {
                // Fetch old record for hook comparison
                let oldRecord = null;
                const adminHooks = await loadAdminHooks(req.project);
                const updateHooks = adminHooks?.hooks?.filter(h => h.table === resource && h.trigger === 'OnUpdate') || [];

                if (updateHooks.length > 0) {
                    // We have OnUpdate hooks for this table, fetch old record
                    const getter = typeof pdb[getMethodName] === 'function' ? pdb[getMethodName] : pdb[altGetMethodName];
                    if (typeof getter === 'function') {
                        oldRecord = await getter(id, host);
                    }
                }

                // Remove host from form data, normalize, then pass to update
                const { host: _, ...cleanData } = data;
                const normalizedData = normalizeRequestData(cleanData, tableSchema);
                const result = await pdb[methodName](id, normalizedData, host);

                if (!result) {
                    return res.status(404).json({ error: `${methodResource} not found` });
                }

                // Check OnUpdate admin hooks with condition evaluation
                if (updateHooks.length > 0) {
                    for (const hook of updateHooks) {
                        // Evaluate condition (if any) with before/after rows
                        if (evaluateCondition(hook.condition, oldRecord, result)) {
                            await publishHookEvent(hook, oldRecord, result, host);
                        }
                    }
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
    // Supports both regular IDs and composite keys (format: "col1:val1,col2:val2")
    server.app.delete('/admin/api/:resource/:id', requireAdmin, async (req, res) => {
        try {
            const resource = req.params.resource;
            const id = req.params.id;
            const rawHost = req.get('X-Forwarded-Host') || req.get('Host');
            const host = rawHost ? rawHost.split(':')[0] : 'localhost';
            const pdb = getProjectDb(req);

            // Convert snake_case resource to PascalCase for method dispatch
            const methodResource = snakeToPascal(resource);

            // Check if this is a composite key (for join tables without primary key)
            const isCompositeKey = id.includes(':') && id.includes(',');

            if (isCompositeKey) {
                // Parse composite key: "item_id:abc123,tag_id:def456" -> {item_id: "abc123", tag_id: "def456"}
                const keyPairs = {};
                id.split(',').forEach(pair => {
                    const [col, ...valParts] = pair.split(':');
                    const val = valParts.join(':'); // Rejoin in case value contains colons
                    if (col && val) {
                        keyPairs[col] = val;
                    }
                });
                console.log('🔍 Composite key parsed:', keyPairs);

                // Find records matching the composite key
                let findMethodName = `find${methodResource}sByHost`;
                if (typeof pdb[findMethodName] !== 'function') {
                    findMethodName = `get${methodResource}sByHost`;
                }
                console.log('🔍 Using find method:', findMethodName);

                if (typeof pdb[findMethodName] === 'function') {
                    const allRecords = await pdb[findMethodName](host);
                    console.log('🔍 All records count:', allRecords.length);
                    if (allRecords.length > 0) {
                        console.log('🔍 Sample record:', allRecords[0]);
                    }

                    // Find records that match all key pairs
                    const matchingRecords = allRecords.filter(record => {
                        const matches = Object.entries(keyPairs).every(([col, val]) => {
                            const recordVal = record[col];
                            const isMatch = recordVal === val;
                            console.log(`🔍 Comparing ${col}: record[${col}]="${recordVal}" === "${val}" ? ${isMatch}`);
                            return isMatch;
                        });
                        return matches;
                    });
                    console.log('🔍 Matching records:', matchingRecords.length);

                    if (matchingRecords.length === 0) {
                        return res.status(404).json({ error: `${methodResource} not found with given keys` });
                    }

                    // Check for OnDelete hooks
                    const adminHooks = await loadAdminHooks(req.project);
                    const deleteHooks = adminHooks?.hooks?.filter(h => h.table === resource && h.trigger === 'OnDelete') || [];

                    // Delete matching records
                    // For records with an 'id' field, use kill method
                    // For join tables without 'id', delete directly via SQL
                    const killMethodName = `kill${methodResource}`;
                    console.log('🔍 Using kill method:', killMethodName, 'exists:', typeof pdb[killMethodName] === 'function');

                    let deletedCount = 0;
                    for (const record of matchingRecords) {
                        console.log('🔍 Deleting record with id:', record.id);
                        if (record.id && typeof pdb[killMethodName] === 'function') {
                            await pdb[killMethodName](record.id, host);

                            // Fire OnDelete hooks
                            for (const hook of deleteHooks) {
                                if (evaluateCondition(hook.condition, record, null)) {
                                    await publishHookEvent(hook, record, null, host);
                                }
                            }

                            deletedCount++;
                        } else {
                            // No id field - this is a join table, delete directly via SQL
                            console.log('🔍 No id field, using direct SQL delete for composite key');
                            const whereClauses = Object.entries(keyPairs)
                                .map((_, i) => `${Object.keys(keyPairs)[i]} = $${i + 1}`)
                                .join(' AND ');
                            const values = Object.values(keyPairs);
                            values.push(host);

                            const sql = `DELETE FROM ${resource} WHERE ${whereClauses} AND host = $${values.length}`;
                            console.log('🔍 SQL:', sql);
                            console.log('🔍 Values:', values);

                            // Use db.query for raw SQL (no hooks for join tables without id)
                            await db.query(sql, values);
                            deletedCount++;
                        }
                    }

                    if (deletedCount > 0) {
                        res.status(204).send();
                    } else {
                        res.status(500).json({ error: 'Failed to delete records' });
                    }
                } else {
                    res.status(404).json({ error: `Resource '${resource}' not queryable` });
                }
            } else {
                // Regular ID-based delete
                const methodName = `kill${methodResource}`;

                if (typeof pdb[methodName] === 'function') {
                    // Check for OnDelete hooks
                    const adminHooks = await loadAdminHooks(req.project);
                    const deleteHooks = adminHooks?.hooks?.filter(h => h.table === resource && h.trigger === 'OnDelete') || [];

                    // Fetch record before deletion if we have hooks
                    let oldRecord = null;
                    if (deleteHooks.length > 0) {
                        const getMethodName = `find${methodResource}ById`;
                        const altGetMethodName = `get${methodResource}ById`;
                        const getter = typeof pdb[getMethodName] === 'function' ? pdb[getMethodName] : pdb[altGetMethodName];
                        if (typeof getter === 'function') {
                            oldRecord = await getter(id, host);
                        }
                    }

                    const result = await pdb[methodName](id, host);

                    if (!result) {
                        return res.status(404).json({ error: `${methodResource} not found` });
                    }

                    // Fire OnDelete hooks
                    if (oldRecord) {
                        for (const hook of deleteHooks) {
                            // Evaluate condition with before=oldRecord, after=null
                            if (evaluateCondition(hook.condition, oldRecord, null)) {
                                await publishHookEvent(hook, oldRecord, null, host);
                            }
                        }
                    }

                    res.status(204).send(); // No content for successful delete
                } else {
                    res.status(404).json({ error: `Resource '${resource}' not killable` });
                }
            }
        } catch (error) {
            console.error('Admin delete error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    console.log('✅ Admin API CRUD endpoints mounted at /admin/api/:resource');
}