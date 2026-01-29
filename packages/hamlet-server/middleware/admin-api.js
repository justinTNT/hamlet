/**
 * Admin API Middleware
 *
 * Exposes a generic CRUD interface for Admin UI.
 * PROTECTED by HAMLET_ADMIN_TOKEN (if set) or development-only.
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

    // Get the database service
    const db = server.getService('database');
    if (!db) {
        console.warn('⚠️ Admin API skipped: Database service not available');
        return;
    }

    // Use the shared admin authentication middleware
    const requireAdmin = createAdminAuth();

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

    // Schema endpoint - MUST come before generic /:resource routes
    server.app.get('/admin/api/schema', requireAdmin, async (req, res) => {
        try {
            const fs = await import('fs');
            const path = await import('path');

            // Try common locations for schema.json
            const possiblePaths = [
                path.join(process.cwd(), 'server', '.generated', 'schema.json'),
                path.join(process.cwd(), '.generated', 'schema.json'),
                path.join(process.cwd(), 'app', 'horatio', 'server', '.generated', 'schema.json')
            ];

            for (const schemaPath of possiblePaths) {
                if (fs.existsSync(schemaPath)) {
                    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                    return res.json(schema);
                }
            }

            res.status(404).json({ error: 'schema.json not found' });
        } catch (error) {
            console.error('Admin schema error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Cache for loaded schema
    let cachedSchema = null;

    // Cache for admin hooks
    let cachedAdminHooks = null;

    // Helper to load admin hooks
    const loadAdminHooks = async () => {
        if (cachedAdminHooks) return cachedAdminHooks;

        const fs = await import('fs');
        const path = await import('path');

        const possiblePaths = [
            path.join(process.cwd(), 'server', '.generated', 'admin-hooks.json'),
            path.join(process.cwd(), '.generated', 'admin-hooks.json'),
            path.join(process.cwd(), 'app', 'horatio', 'server', '.generated', 'admin-hooks.json')
        ];

        for (const hooksPath of possiblePaths) {
            if (fs.existsSync(hooksPath)) {
                cachedAdminHooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
                return cachedAdminHooks;
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

    // Helper to load schema
    const loadSchema = async () => {
        if (cachedSchema) return cachedSchema;

        const fs = await import('fs');
        const path = await import('path');

        const possiblePaths = [
            path.join(process.cwd(), 'server', '.generated', 'schema.json'),
            path.join(process.cwd(), '.generated', 'schema.json'),
            path.join(process.cwd(), 'app', 'horatio', 'server', '.generated', 'schema.json')
        ];

        for (const schemaPath of possiblePaths) {
            if (fs.existsSync(schemaPath)) {
                cachedSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                return cachedSchema;
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

            const methodResource = snakeToPascal(resource);

            // Try soft delete-aware method first, fallback to original
            let methodName = `find${methodResource}sByHost`;
            if (typeof db[methodName] !== 'function') {
                methodName = `get${methodResource}sByHost`;
            }

            if (typeof db[methodName] === 'function') {
                const results = await db[methodName](host);
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
            const schema = await loadSchema();
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

            const schema = await loadSchema();
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
            const methodResource = snakeToPascal(relatedTable);
            let methodName = `find${methodResource}sByHost`;
            if (typeof db[methodName] !== 'function') {
                methodName = `get${methodResource}sByHost`;
            }

            if (typeof db[methodName] === 'function') {
                const allRecords = await db[methodName](host);
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

            const schema = await loadSchema();
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
            const methodResource = snakeToPascal(m2m.joinTable);
            let methodName = `find${methodResource}sByHost`;
            if (typeof db[methodName] !== 'function') {
                methodName = `get${methodResource}sByHost`;
            }

            if (typeof db[methodName] === 'function') {
                const allJoinRecords = await db[methodName](host);
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

            const schema = await loadSchema();
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

            const methodResource = snakeToPascal(m2m.joinTable);

            // Get existing join records
            let findMethodName = `find${methodResource}sByHost`;
            if (typeof db[findMethodName] !== 'function') {
                findMethodName = `get${methodResource}sByHost`;
            }

            if (typeof db[findMethodName] !== 'function') {
                return res.status(404).json({ error: `Join table '${m2m.joinTable}' not queryable` });
            }

            const allJoinRecords = await db[findMethodName](host);
            const existingJoinRecords = allJoinRecords.filter(record => record[resourceFk.column] === id);
            const existingLinkedIds = existingJoinRecords.map(record => record[relatedFk.column]);

            // Determine which to add and which to remove
            const toAdd = linkedIds.filter(lid => !existingLinkedIds.includes(lid));
            const toRemove = existingLinkedIds.filter(lid => !linkedIds.includes(lid));

            // Remove unlinked records (soft delete)
            const killMethodName = `kill${methodResource}`;
            if (typeof db[killMethodName] === 'function' && toRemove.length > 0) {
                for (const removeId of toRemove) {
                    const recordToRemove = existingJoinRecords.find(r => r[relatedFk.column] === removeId);
                    if (recordToRemove && recordToRemove.id) {
                        await db[killMethodName](recordToRemove.id, host);
                    }
                }
            }

            // Add new linked records
            const createMethodName = `create${methodResource}`;
            if (typeof db[createMethodName] === 'function' && toAdd.length > 0) {
                for (const addId of toAdd) {
                    await db[createMethodName]({
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

            // Convert snake_case resource to PascalCase for method dispatch
            const methodResource = snakeToPascal(resource);

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
            const schema = await loadSchema();
            const tableSchema = schema?.tables?.[resource];

            // Convert snake_case resource to PascalCase for method dispatch
            const methodResource = snakeToPascal(resource);
            const methodName = `create${methodResource}`;

            if (typeof db[methodName] === 'function') {
                // Remove host from form data, normalize, then add host back
                const { host: _, ...cleanData } = data;
                const normalizedData = normalizeRequestData(cleanData, tableSchema);
                const result = await db[methodName]({ ...normalizedData, host });

                // Check OnInsert admin hooks
                const adminHooks = await loadAdminHooks();
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
            const schema = await loadSchema();
            const tableSchema = schema?.tables?.[resource];

            // Convert snake_case resource to PascalCase for method dispatch
            const methodResource = snakeToPascal(resource);
            const methodName = `update${methodResource}`;
            const getMethodName = `find${methodResource}ById`;
            const altGetMethodName = `get${methodResource}ById`;

            if (typeof db[methodName] === 'function') {
                // Fetch old record for hook comparison
                let oldRecord = null;
                const adminHooks = await loadAdminHooks();
                const updateHooks = adminHooks?.hooks?.filter(h => h.table === resource && h.trigger === 'OnUpdate') || [];

                if (updateHooks.length > 0) {
                    // We have OnUpdate hooks for this table, fetch old record
                    const getter = typeof db[getMethodName] === 'function' ? db[getMethodName] : db[altGetMethodName];
                    if (typeof getter === 'function') {
                        oldRecord = await getter(id, host);
                    }
                }

                // Remove host from form data, normalize, then pass to update
                const { host: _, ...cleanData } = data;
                const normalizedData = normalizeRequestData(cleanData, tableSchema);
                const result = await db[methodName](id, normalizedData, host);

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
                if (typeof db[findMethodName] !== 'function') {
                    findMethodName = `get${methodResource}sByHost`;
                }
                console.log('🔍 Using find method:', findMethodName);

                if (typeof db[findMethodName] === 'function') {
                    const allRecords = await db[findMethodName](host);
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
                    const adminHooks = await loadAdminHooks();
                    const deleteHooks = adminHooks?.hooks?.filter(h => h.table === resource && h.trigger === 'OnDelete') || [];

                    // Delete matching records
                    // For records with an 'id' field, use kill method
                    // For join tables without 'id', delete directly via SQL
                    const killMethodName = `kill${methodResource}`;
                    console.log('🔍 Using kill method:', killMethodName, 'exists:', typeof db[killMethodName] === 'function');

                    let deletedCount = 0;
                    for (const record of matchingRecords) {
                        console.log('🔍 Deleting record with id:', record.id);
                        if (record.id && typeof db[killMethodName] === 'function') {
                            await db[killMethodName](record.id, host);

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

                if (typeof db[methodName] === 'function') {
                    // Check for OnDelete hooks
                    const adminHooks = await loadAdminHooks();
                    const deleteHooks = adminHooks?.hooks?.filter(h => h.table === resource && h.trigger === 'OnDelete') || [];

                    // Fetch record before deletion if we have hooks
                    let oldRecord = null;
                    if (deleteHooks.length > 0) {
                        const getMethodName = `find${methodResource}ById`;
                        const altGetMethodName = `get${methodResource}ById`;
                        const getter = typeof db[getMethodName] === 'function' ? db[getMethodName] : db[altGetMethodName];
                        if (typeof getter === 'function') {
                            oldRecord = await getter(id, host);
                        }
                    }

                    const result = await db[methodName](id, host);

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