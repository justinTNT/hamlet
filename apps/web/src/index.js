import init, { encode_request, decode_response } from 'proto-rust';
import { Elm } from './Main.elm';

console.log("Horatio Client v1.0.0 - Ports Debug");

async function run() {
    // Initialize WASM module
    try {
        await init();
        console.log("WASM module initialized successfully.");
    } catch (e) {
        console.error("Failed to initialize WASM module:", e);
        return;
    }

    const app = Elm.Main.init({
        node: document.getElementById('app'),
    });

    console.log('Elm app initialized. Ports:', app.ports);

    if (app.ports && app.ports.log) {
        app.ports.log.subscribe((message) => {
            console.log("ELM DEBUG PORT:", message);
        });
    } else {
        console.warn("Elm 'log' port not found.");
    }

    if (app.ports && app.ports.rpcRequest) {
        app.ports.rpcRequest.subscribe(async ({ endpoint, body, correlationId }) => {
            try {
                console.log('RPC request received from Elm:', { endpoint, body, correlationId });

                // Parse the incoming Elm body (which is JSON string of GetClassWithStudentsReq)
                const parsedBody = body;

                // Simulate an error condition if classId is 0, mirroring the Rust logic
                if (endpoint === 'GetClassWithStudents' && parsedBody.classId === 0) {
                    const errorResponse = JSON.stringify({
                        type: "ValidationError",
                        details: { field: "classId", message: "classId cannot be 0 for GetClassWithStudents (JS mock error)" }
                    });
                    console.log('Sending JS mock error response:', { endpoint, body: errorResponse, correlationId });
                    setTimeout(() => {
                        app.ports.rpcResponse.send({
                            endpoint,
                            body: errorResponse,
                            correlationId,
                        });
                    }, 500);
                    return;
                }

                // Use WASM to encode the request body (for POC, it's a pass-through)
                console.log("Encoding request via WASM...");
                const encodedBody = encode_request(endpoint, JSON.stringify(body));
                console.log("Encoded request:", encodedBody);

                // ** REAL NETWORK CALL **
                fetch('/api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RPC-Endpoint': endpoint,
                    },
                    body: encodedBody,
                })
                    .then(async (res) => {
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        return res.text();
                    })
                    .then((wireResponse) => {
                        console.log('Received response from server:', wireResponse);

                        // Use WASM to decode the wire response
                        const normalizedBody = decode_response(endpoint, wireResponse);
                        console.log('Decoded response via WASM:', normalizedBody);

                        app.ports.rpcResponse.send({
                            endpoint,
                            body: normalizedBody,
                            correlationId,
                        });
                    })
                    .catch(err => {
                        console.error('Fetch error:', err);
                        const errorResponse = JSON.stringify({
                            type: "InternalError",
                            details: `Network error: ${err.message}`
                        });
                        app.ports.rpcResponse.send({
                            endpoint,
                            body: errorResponse,
                            correlationId,
                        });
                    });
            } catch (e) {
                console.error("CRITICAL ERROR in rpcRequest handler:", e);
            }
        });
    }
}

run();
