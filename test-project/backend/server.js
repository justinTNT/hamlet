import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as Proto from 'proto-rust';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Load Manifests
const contextManifest = JSON.parse(Proto.get_context_manifest());
const endpointManifest = JSON.parse(Proto.get_endpoint_manifest());

console.log("Loaded Context Manifest:", contextManifest);
console.log("Loaded Endpoint Manifest:", endpointManifest);

// Mock Database
let counter = 0;

async function hydrateContext(endpoint, reqBody) {
    const def = endpointManifest.find(e => e.endpoint === endpoint);
    if (!def || !def.context_type) return null;

    const contextTypeName = def.context_type;
    const dependencies = contextManifest.filter(c => c.type_name === contextTypeName);

    const contextData = {};

    for (const dep of dependencies) {
        // In a real app, you'd fetch data based on dep.source
        // For this template, we have no dependencies defined yet.
        console.log(`Hydrating dependency: ${dep.field_name} from ${dep.source}`);
    }

    return contextData;
}

app.post('/api', async (req, res) => {
    const { endpoint, body } = req.body;
    console.log(`[${endpoint}] Request received`);

    try {
        // 1. Hydrate Context
        const contextData = await hydrateContext(endpoint, body);

        // 2. Construct Bundle (if needed)
        // For IncrementReq, we defined server_context="StandardServerContext"
        // So we need to wrap it.

        // Mock Context
        const serverContext = {
            user_id: null,
            is_extension: false
        };

        // If the endpoint expects a bundle, we should construct it.
        // But the dispatcher macro in Rust expects the *Request* struct, validates it, and executes logic?
        // Wait, the dispatcher macro currently only validates. It doesn't execute business logic.
        // The business logic is usually in the Node.js handler for now, OR we move it to Rust.
        // In the current architecture, Rust does validation and type definition. Node does execution.
        // So here we handle the logic.

        if (endpoint === 'Increment') {
            const amount = body.amount || 1;
            counter += amount;
            res.json({ newValue: counter });
        } else {
            res.status(404).json({ error: "Unknown endpoint" });
        }

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});
