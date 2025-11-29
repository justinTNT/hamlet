import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as wasm from '../../shared/proto-rust/pkg-node/proto_rust.js';
const { decode_request, encode_response } = wasm;

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.text({ type: 'application/json' }));

// In-memory Database: { "host": { items: [], comments: [] } }
const db = {};

// Helper to get or create tenant DB
const getTenantDb = (host) => {
    if (!db[host]) {
        db[host] = { items: [], comments: [] };
        // Seed some data
        db[host].items.push({
            id: "1",
            title: `Welcome to ${host}`,
            link: "https://example.com",
            image: "https://placehold.co/600x400",
            extract: "This is the first post on this microblog.",
            owner_comment: "Enjoy the feed!",
            timestamp: Date.now()
        });
    }
    return db[host];
};

// WASM is initialized automatically on import in nodejs target

app.post('/api', (req, res) => {
    // Multi-tenancy: use Host header (or fallback for local dev)
    // In local dev, Vite proxies, so Host might be localhost:3000. 
    // Ideally, we'd use a custom header X-Tenant-ID for explicit testing, 
    // but let's use Host and strip port for simplicity.
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
        const tenantDb = getTenantDb(host);
        let responseData;

        if (endpoint === "GetFeed") {
            responseData = {
                items: tenantDb.items
            };
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
            tenantDb.items.unshift(newItem); // Add to top
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

app.listen(port, () => {
    console.log(`Horatio Backend running at http://localhost:${port}`);
});
