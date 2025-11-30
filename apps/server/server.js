import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pg from 'pg';
import fs from 'fs';
import * as wasm from '../../shared/proto-rust/pkg-node/proto_rust.js';
const { decode_request, encode_response } = wasm;

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.text({ type: 'application/json' }));

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

app.post('/api', async (req, res) => {
    // Multi-tenancy: use Host header (or fallback for local dev)
    const host = req.header('X-Tenant-ID') || req.hostname;
    const endpoint = req.header('X-RPC-Endpoint');

    console.log(`[${host}] Request: ${endpoint}`);
    const wireRequest = req.body;

    try {
        // 1. Validate with WASM
        const decodedReqJson = decode_request(endpoint, wireRequest);

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

            const items = result.rows.map(row => ({
                ...row,
                timestamp: Number(row.timestamp),
                tags: row.tags || []
            }));

            responseData = { items };

        } else if (endpoint === "GetTags") {
            const result = await pool.query(
                'SELECT name FROM tags WHERE host = $1 ORDER BY name ASC',
                [host]
            );
            responseData = { tags: result.rows.map(r => r.name) };

        } else if (endpoint === "SubmitItem") {
            const reqObj = JSON.parse(wireRequest);
            const newItem = {
                id: Date.now().toString(),
                title: reqObj.title,
                link: reqObj.link,
                image: reqObj.image,
                extract: reqObj.extract,
                owner_comment: reqObj.owner_comment,
                tags: reqObj.tags || [],
                timestamp: Date.now()
            };

            // Transaction for item + tags
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                await client.query(
                    `INSERT INTO microblog_items (id, host, title, link, image, extract, owner_comment, timestamp)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [newItem.id, host, newItem.title, newItem.link, newItem.image, newItem.extract, newItem.owner_comment, newItem.timestamp]
                );

                if (newItem.tags && newItem.tags.length > 0) {
                    for (const tagName of newItem.tags) {
                        // 1. Ensure tag exists
                        let tagRes = await client.query(
                            'SELECT id FROM tags WHERE host = $1 AND name = $2',
                            [host, tagName]
                        );

                        let tagId;
                        if (tagRes.rows.length === 0) {
                            const insertRes = await client.query(
                                'INSERT INTO tags (host, name) VALUES ($1, $2) RETURNING id',
                                [host, tagName]
                            );
                            tagId = insertRes.rows[0].id;
                        } else {
                            tagId = tagRes.rows[0].id;
                        }

                        // 2. Link tag to item
                        await client.query(
                            'INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                            [newItem.id, tagId]
                        );
                    }
                }

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }

            responseData = { item: newItem };

        } else {
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        // 3. Encode Response
        const wireResponse = encode_response(endpoint, JSON.stringify(responseData));
        res.send(wireResponse);

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send(JSON.stringify({ type: "InternalError", details: `Server error: ${error.message}` }));
    }
});

// Start Server
runMigrations().then(() => {
    app.listen(port, () => {
        console.log(`Horatio Backend running at http://localhost:${port}`);
    });
});

