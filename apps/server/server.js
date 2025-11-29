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
async function runMigrations() {
    try {
        const sql = fs.readFileSync('./migrations/001_init.sql', 'utf8');
        await pool.query(sql);
        console.log("Migrations applied successfully.");
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
                'SELECT id, title, link, image, extract, owner_comment, timestamp FROM microblog_items WHERE host = $1 ORDER BY timestamp DESC',
                [host]
            );
            // Convert timestamp string (bigint) to number if needed, or keep as is. 
            // Postgres bigint comes as string in JS. Our Rust struct expects u64 (number in JSON).
            // We need to map it.
            const items = result.rows.map(row => ({
                ...row,
                timestamp: Number(row.timestamp)
            }));

            responseData = { items };

        } else if (endpoint === "SubmitItem") {
            const reqObj = JSON.parse(wireRequest);
            const newItem = {
                id: Date.now().toString(),
                title: reqObj.title,
                link: reqObj.link,
                image: reqObj.image,
                extract: reqObj.extract,
                owner_comment: reqObj.owner_comment,
                timestamp: Date.now()
            };

            await pool.query(
                `INSERT INTO microblog_items (id, host, title, link, image, extract, owner_comment, timestamp)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [newItem.id, host, newItem.title, newItem.link, newItem.image, newItem.extract, newItem.owner_comment, newItem.timestamp]
            );

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

