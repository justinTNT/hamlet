import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pg from 'pg';
const { Pool } = pg;
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import crypto from 'node:crypto';
import fs from 'fs';
import * as wasm from '../../../pkg-node/proto_rust.js';
const { dispatcher } = require('../../../pkg-node/proto_rust.js');
const { Elm } = require('./elm-logic.cjs');
const { encode_response, get_openapi_spec, get_context_manifest, get_endpoint_manifest, validate_manifest } = wasm;

// Type-Safe Key-Value Store Infrastructure
class TenantKeyValueStore {
    constructor() {
        this.tenantStores = new Map(); // host -> Map<string, { value, expires_at, type }>
    }

    getOrCreateStore(host) {
        if (!this.tenantStores.has(host)) {
            this.tenantStores.set(host, new Map());
        }
        return this.tenantStores.get(host);
    }

    set(host, type, key, value, ttlSeconds = null) {
        const store = this.getOrCreateStore(host);
        const fullKey = `${type}:${key}`;
        
        store.set(fullKey, {
            value: value,
            expires_at: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null,
            type: type,
            created_at: Date.now()
        });
        
        return { success: true };
    }

    get(host, type, key) {
        const store = this.getOrCreateStore(host);
        const fullKey = `${type}:${key}`;
        const item = store.get(fullKey);
        
        if (!item) {
            return { value: null, found: false };
        }
        
        // Check expiration
        if (item.expires_at && item.expires_at < Date.now()) {
            store.delete(fullKey);
            return { value: null, found: false, expired: true };
        }
        
        return { value: item.value, found: true, type: item.type };
    }

    delete(host, type, key) {
        const store = this.getOrCreateStore(host);
        const fullKey = `${type}:${key}`;
        const existed = store.has(fullKey);
        store.delete(fullKey);
        return { success: true, existed };
    }

    list(host, prefix) {
        const store = this.getOrCreateStore(host);
        const results = [];
        
        for (const [fullKey, item] of store.entries()) {
            // Check expiration
            if (item.expires_at && item.expires_at < Date.now()) {
                store.delete(fullKey);
                continue;
            }
            
            if (fullKey.startsWith(prefix)) {
                results.push({
                    key: fullKey,
                    value: item.value,
                    type: item.type,
                    created_at: item.created_at
                });
            }
        }
        
        return results;
    }

    cleanup(host) {
        const store = this.getOrCreateStore(host);
        let cleaned = 0;
        
        for (const [fullKey, item] of store.entries()) {
            if (item.expires_at && item.expires_at < Date.now()) {
                store.delete(fullKey);
                cleaned++;
            }
        }
        
        return { cleaned };
    }

    stats(host = null) {
        if (host) {
            const store = this.getOrCreateStore(host);
            return {
                total_keys: store.size,
                host: host
            };
        } else {
            let totalKeys = 0;
            const tenantCounts = {};
            
            for (const [tenantHost, store] of this.tenantStores.entries()) {
                const count = store.size;
                tenantCounts[tenantHost] = count;
                totalKeys += count;
            }
            
            return {
                total_keys: totalKeys,
                tenant_count: this.tenantStores.size,
                per_tenant: tenantCounts
            };
        }
    }
}

// Global KV store instance
const kvStore = new TenantKeyValueStore();

// Run BuildAmp validation and display results
const validationReport = validate_manifest();
console.log(validationReport);

// Parse manifests (these now include error handling)
const contextManifest = JSON.parse(get_context_manifest());
const endpointManifest = JSON.parse(get_endpoint_manifest());

// Warn about validation errors but keep running with last good build
if (contextManifest.error || endpointManifest.error) {
    console.warn("[BuildAmp] ⚠️  Validation errors detected - continuing with last working build");
    console.warn("[BuildAmp] Fix the errors above and save a file to rebuild");
    // Server keeps running with previous WASM build
}

async function hydrateContext(endpoint, wireRequest, serverContext) {
    const endpointDef = endpointManifest.find(e => e.endpoint === endpoint);
    if (!endpointDef || !endpointDef.context_type) {
        return { context: serverContext, input: wireRequest };
    }
    const contextType = endpointDef.context_type;
    const contextDefs = contextManifest.filter(c => c.type === contextType);

    const data = {};

    for (const def of contextDefs) {
        if (def.source === "table:tags") {
            const res = await pool.query('SELECT id, name FROM tags WHERE host = $1', [serverContext.host]);
            data[def.field] = res.rows;
        } else if (def.source === "table:guests:by_session") {
            const sessionId = serverContext.session_id;
            if (sessionId) {
                const res = await pool.query('SELECT * FROM guests WHERE id = $1', [sessionId]);
                data[def.field] = res.rows.length > 0 ? res.rows[0] : null;
            } else {
                data[def.field] = null;
            }
        }
    }

    return {
        context: serverContext,
        input: wireRequest,
        data: data
    };
}

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Postgres Connection
const pool = new pg.Pool({
    user: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'password',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    database: process.env.POSTGRES_DB || 'horatio',
    port: 5432,
});

// Run Migrations
// Run Migrations
async function runMigrations() {
    try {
        const files = fs.readdirSync('./migrations').sort();
        for (const file of files) {
            if (file.endsWith('.sql')) {
                console.log(`Applying migration: ${file}`);
                const sql = fs.readFileSync(`./migrations/${file}`, 'utf8');
                await pool.query(sql);
            }
        }
        console.log("All migrations applied successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

// WASM is initialized automatically on import in nodejs target



app.get('/api/spec', (req, res) => {
    res.json(JSON.parse(get_openapi_spec()));
});

// Swagger UI
app.get('/api/docs', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Horatio API Docs</title>
            <link rel="stylesheet" type="text/css" href="/api/docs/swagger-ui.css" />
            <link rel="stylesheet" type="text/css" href="/api/docs/index.css" />
            <link rel="icon" type="image/png" href="/api/docs/favicon-32x32.png" sizes="32x32" />
            <link rel="icon" type="image/png" href="/api/docs/favicon-16x16.png" sizes="16x16" />
        </head>
        <body>
            <div id="swagger-ui"></div>
            <script src="/api/docs/swagger-ui-bundle.js" charset="UTF-8"> </script>
            <script src="/api/docs/swagger-ui-standalone-preset.js" charset="UTF-8"> </script>
            <script>
                window.onload = function() {
                    const ui = SwaggerUIBundle({
                        url: "/api/spec",
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIStandalonePreset
                        ],
                        plugins: [
                            SwaggerUIBundle.plugins.DownloadUrl
                        ],
                        layout: "StandaloneLayout"
                    });
                    window.ui = ui;
                };
            </script>
        </body>
        </html>
    `);
});
// Try to serve from root node_modules (hoisted) or local
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swaggerPath = path.resolve(__dirname, '../../node_modules/swagger-ui-dist');
app.use('/api/docs', express.static(swaggerPath));

app.post(['/api', '/:endpoint'], async (req, res) => {
    // Multi-tenancy: use Host header (or fallback for local dev)
    const host = req.header('X-Tenant-ID') || req.hostname;

    // Determine endpoint: URL param > Header
    let endpoint = req.params.endpoint;
    if (!endpoint || endpoint === 'api') {
        endpoint = req.header('X-RPC-Endpoint');
    }

    console.log(`[${host}] Request: ${endpoint}`);
    console.log("Endpoint debug:", endpoint, endpoint === 'SubmitComment');
    const wireRequest = req.body;

    // --- Elm Backend Integration ---
    if (endpoint === 'ElmTest') {
        return new Promise((resolve) => {
            const app = Elm.Logic.init();
            app.ports.result.subscribe((data) => {
                res.json(data);
                resolve();
            });
            app.ports.process.send(wireRequest);
        });
    }
    // -------------------------------

    try {
        // 1. Construct Context
        const context = {
            host: req.headers.host,
            user_id: "user_123", // Hardcoded for now
            role: "user",
            is_extension: req.headers['x-hamlet-source'] === 'extension'
        };

        // 2. Validate with WASM
        const decodedReqJson = dispatcher(endpoint, JSON.stringify(wireRequest), JSON.stringify(context));

        if (decodedReqJson.includes('"type":"ValidationError"') || decodedReqJson.includes('"type":"NotFound"')) {
            console.log("Validation failed:", decodedReqJson);
            return res.send(decodedReqJson);
        }

        // 2. Business Logic
        let responseData;

        if (endpoint === "GetFeed") {
            const result = await pool.query(
                `SELECT i.id, i.title, i.link, i.image, i.extract, i.owner_comment, i.timestamp,
                        COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
                 FROM microblog_items i
                 LEFT JOIN item_tags it ON i.id = it.item_id
                 LEFT JOIN tags t ON it.tag_id = t.id
                 WHERE i.host = $1
                 GROUP BY i.id
                 ORDER BY i.timestamp DESC`,
                [host]
            );

            // Fetch comments
            const commentsResult = await pool.query(
                `SELECT c.id, c.item_id, c.guest_id, c.parent_id, c.text, c.timestamp, g.name as author_name
                 FROM item_comments c
                 JOIN guests g ON c.guest_id = g.id
                 WHERE c.host = $1
                 ORDER BY c.timestamp ASC`,
                [host]
            );

            const commentsByItem = {};
            for (const comment of commentsResult.rows) {
                if (!commentsByItem[comment.item_id]) {
                    commentsByItem[comment.item_id] = [];
                }
                commentsByItem[comment.item_id].push({
                    ...comment,
                    timestamp: Number(comment.timestamp),
                    parent_id: comment.parent_id || null // Ensure null if missing
                });
            }

            const items = result.rows.map(row => ({
                ...row,
                timestamp: Number(row.timestamp),
                tags: row.tags || [],
                comments: commentsByItem[row.id] || []
            }));

            responseData = { items };

        } else if (endpoint === "GetTags") {
            const result = await pool.query(
                'SELECT name FROM tags WHERE host = $1 ORDER BY name ASC',
                [host]
            );
            responseData = { tags: result.rows.map(r => r.name) };

        } else if (endpoint === "SubmitItem") {
            // Inject host for Elm
            wireRequest.host = host;

            // 1. Hydrate Context (Declarative)
            const bundle = await hydrateContext(endpoint, wireRequest, {
                request_id: crypto.randomUUID(),
                session_id: null,
                user_id: null,
                host: host
            });

            // 2. Add Generated Data (Imperative)
            const inputTags = wireRequest.tags || [];
            bundle.data.fresh_tag_ids = inputTags.map(() => crypto.randomUUID());

            const slice = bundle; // Alias for consistency

            // 3. Call Elm
            const output = await new Promise((resolve) => {
                const app = Elm.Logic.init();
                const sub = (data) => {
                    app.ports.result.unsubscribe(sub);
                    resolve(data);
                };
                app.ports.result.subscribe(sub);
                app.ports.process.send({ SubmitItem: slice });
            });

            // 4. Handle Output
            if (output.error) {
                return res.status(500).json({ type: "InternalError", details: output.error });
            }

            // 5. Execute Effects
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                for (const effect of output.effects) {
                    if (effect.Insert) {
                        const { table, data } = effect.Insert;
                        const row = JSON.parse(data); // data is JSON string
                        const keys = Object.keys(row);
                        const values = Object.values(row);
                        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

                        await client.query(
                            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
                            values
                        );
                    } else if (effect.Log) {
                        try {
                            const logObj = JSON.parse(effect.Log);
                            console.log(JSON.stringify(logObj)); // Print as JSON line
                        } catch (e) {
                            console.log("Elm Log:", effect.Log);
                        }
                    } else if (effect.ScheduleEvent) {
                        const { event_type, payload, delay_minutes } = effect.ScheduleEvent;
                        const executeAt = new Date(Date.now() + delay_minutes * 60 * 1000);
                        
                        await client.query(
                            `INSERT INTO events (host, event_type, payload, execute_at) VALUES ($1, $2, $3, $4)`,
                            [host, event_type, payload, executeAt]
                        );
                        console.log(`Scheduled event: ${event_type} for ${executeAt.toISOString()}`);
                    }
                }

                await client.query('COMMIT');

                // 6. Send Response
                if (output.response) {
                    res.json(JSON.parse(output.response));
                } else {
                    res.status(200).send();
                }

            } catch (e) {
                await client.query('ROLLBACK');
                console.error("Effect Execution Failed:", e);
                res.status(500).json({ type: "InternalError", details: e.message });
            } finally {
                client.release();
            }
            return;

        } else if (endpoint === 'SubmitComment') {
            const wireRequest = req.body;
            if (wireRequest.author_name === undefined) {
                wireRequest.author_name = null;
            }
            // Inject host for Elm
            wireRequest.host = host;

            const sessionId = req.get('X-Session-ID') || 'unknown-session'; // Simple Session ID

            // 1. Hydrate Context (Declarative)
            const bundle = await hydrateContext(endpoint, wireRequest, {
                request_id: crypto.randomUUID(),
                session_id: sessionId,
                user_id: null,
                host: host
            });

            // 2. Add Generated Data (Imperative)
            bundle.data.fresh_guest_id = sessionId;
            bundle.data.fresh_comment_id = crypto.randomUUID();

            const slice = bundle;

            // 3. Call Elm
            const output = await new Promise((resolve) => {
                const app = Elm.Logic.init();
                const sub = (data) => {
                    app.ports.result.unsubscribe(sub);
                    resolve(data);
                };
                app.ports.result.subscribe(sub);
                app.ports.process.send({ SubmitComment: slice });
            });

            // 4. Execute Effects (Generic Executor)
            const executorClient = await pool.connect();
            try {
                await executorClient.query('BEGIN');

                if (output.error) {
                    await executorClient.query('ROLLBACK');
                    res.status(400).json({ error: output.error });
                    return;
                }

                for (const effect of output.effects) {
                    if (effect.Insert) {
                        const { table, data } = effect.Insert;
                        const row = JSON.parse(data);
                        const keys = Object.keys(row);
                        const values = Object.values(row);
                        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

                        await executorClient.query(
                            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
                            values
                        );
                    } else if (effect.Log) {
                        try {
                            const logObj = JSON.parse(effect.Log);
                            console.log(JSON.stringify(logObj));
                        } catch (e) {
                            console.log("Elm Log:", effect.Log);
                        }
                    } else if (effect.ScheduleEvent) {
                        const { event_type, payload, delay_minutes } = effect.ScheduleEvent;
                        const executeAt = new Date(Date.now() + delay_minutes * 60 * 1000);
                        
                        await executorClient.query(
                            `INSERT INTO events (host, event_type, payload, execute_at) VALUES ($1, $2, $3, $4)`,
                            [host, event_type, payload, executeAt]
                        );
                        console.log(`Scheduled event: ${event_type} for ${executeAt.toISOString()}`);
                    }
                }

                await executorClient.query('COMMIT');

                if (output.response) {
                    res.json(JSON.parse(output.response));
                } else {
                    res.status(200).send();
                }

            } catch (e) {
                await executorClient.query('ROLLBACK');
                console.error("Effect Execution Failed:", e);
                res.status(500).json({ type: "InternalError", details: e.message });
            } finally {
                executorClient.release();
            }
            return;
        } else {
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        const wireResponse = encode_response(endpoint, JSON.stringify(responseData));
        res.send(wireResponse);

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send(JSON.stringify({ type: "InternalError", details: `Server error: ${error.message}` }));
    }
});

// Key-Value Store API Endpoints
// Following BuildAmp tenant isolation pattern

// Set key-value pair
app.post('/kv/set/:type/:key', (req, res) => {
    try {
        const host = req.get('Host') || 'localhost';
        const { type, key } = req.params;
        const { value, ttl } = req.body;
        
        if (!value) {
            return res.status(400).json({ error: 'Value is required' });
        }
        
        const result = kvStore.set(host, type, key, value, ttl);
        res.json(result);
    } catch (error) {
        console.error('KV Set error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get key-value pair
app.get('/kv/get/:type/:key', (req, res) => {
    try {
        const host = req.get('Host') || 'localhost';
        const { type, key } = req.params;
        
        const result = kvStore.get(host, type, key);
        res.json(result);
    } catch (error) {
        console.error('KV Get error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete key-value pair
app.delete('/kv/delete/:type/:key', (req, res) => {
    try {
        const host = req.get('Host') || 'localhost';
        const { type, key } = req.params;
        
        const result = kvStore.delete(host, type, key);
        res.json(result);
    } catch (error) {
        console.error('KV Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List keys with prefix
app.get('/kv/list/:prefix', (req, res) => {
    try {
        const host = req.get('Host') || 'localhost';
        const { prefix } = req.params;
        
        const results = kvStore.list(host, prefix);
        res.json({ keys: results });
    } catch (error) {
        console.error('KV List error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cleanup expired keys for a tenant
app.post('/kv/cleanup', (req, res) => {
    try {
        const host = req.get('Host') || 'localhost';
        
        const result = kvStore.cleanup(host);
        res.json(result);
    } catch (error) {
        console.error('KV Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get KV store statistics
app.get('/kv/stats', (req, res) => {
    try {
        const host = req.get('Host') || 'localhost';
        const { global } = req.query;
        
        const stats = global === 'true' ? kvStore.stats() : kvStore.stats(host);
        res.json(stats);
    } catch (error) {
        console.error('KV Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start Server
runMigrations().then(() => {
    app.listen(port, () => {
        console.log(`Horatio Backend running at http://localhost:${port}`);
        console.log(`Key-Value Store endpoints available at http://localhost:${port}/kv/*`);
    });
});
