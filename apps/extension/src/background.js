import init, { decode_request, encode_response } from 'proto-rust';

console.log("Horatio Extension Background Service Worker Starting...");

// Vite plugin handles WASM init automatically via top-level await usually,
// but for background workers we might need to be explicit or rely on the plugin's injection.
// With vite-plugin-wasm, we can just import it.


chrome.runtime.onInstalled.addListener(() => {
    chrome.action.disable();

    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { schemes: ['http', 'https'] },
                })
            ],
            actions: [new chrome.declarativeContent.ShowAction()]
        }]);
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background received:", request);

    handleRequest(request)
        .then(response => {
            console.log("Background sending response:", response);
            sendResponse(response);
        })
        .catch(err => {
            console.error("Background error:", err);
            sendResponse({
                correlationId: request.correlationId,
                body: null,
                error: err.toString()
            });
        });

    return true; // Keep channel open for async response
});

async function handleRequest(req) {
    // await ensureWasm(); // Handled by import


    const { endpoint, body, correlationId } = req;
    const bodyJson = JSON.stringify(body);

    // 1. Decode Request (Validation) - Client-side check
    const decodedJson = decode_request(endpoint, bodyJson);
    const decoded = JSON.parse(decodedJson);

    // Check if it's an error from WASM validation
    if (decoded.type && (decoded.type === "ValidationError" || decoded.type === "NotFound")) {
        return {
            correlationId,
            body: null,
            error: JSON.stringify(decoded)
        };
    }

    // 2. Forward to Backend
    try {
        const response = await fetch('http://localhost:3000/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RPC-Endpoint': endpoint
            },
            body: bodyJson
        });

        const responseText = await response.text();

        // The backend returns the encoded JSON response (or error)
        // We need to parse it to pass it back to Elm as a JSON object
        // (because Api.Port expects a Value, not a string)
        const responseData = JSON.parse(responseText);

        return {
            correlationId,
            body: responseData,
            error: null
        };

    } catch (err) {
        console.error("Network error:", err);
        return {
            correlationId,
            body: null,
            error: "Network Error: " + err.message
        };
    }
}
