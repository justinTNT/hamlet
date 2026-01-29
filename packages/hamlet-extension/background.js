/**
 * Hamlet Extension Background Service Worker
 *
 * Forwards API requests from the popup to the backend server.
 * This is framework code - do not modify unless updating hamlet-extension.
 */

console.log("Hamlet Extension Background Service Worker Starting...");

// Default API URL - can be overridden via chrome.storage
const DEFAULT_API_URL = 'http://localhost:3000/api';

// Detect browser (Firefox uses browser.*, Chrome uses chrome.*)
const isFirefox = typeof browser !== 'undefined';
const api = isFirefox ? browser : chrome;

// Chrome: use declarativeContent to show icon only on http/https
// Firefox: icon always shown (declarativeContent not supported)
if (!isFirefox && api.declarativeContent) {
    api.runtime.onInstalled.addListener(() => {
        api.action.disable();

        api.declarativeContent.onPageChanged.removeRules(undefined, () => {
            api.declarativeContent.onPageChanged.addRules([{
                conditions: [
                    new api.declarativeContent.PageStateMatcher({
                        pageUrl: { schemes: ['http', 'https'] },
                    })
                ],
                actions: [new api.declarativeContent.ShowAction()]
            }]);
        });
    });
}

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

async function getApiUrl() {
    // Future: could read from storage for configurable endpoints
    return DEFAULT_API_URL;
}

async function handleRequest(req) {
    const { endpoint, body, correlationId, apiUrl, hostKey } = req;
    const baseUrl = apiUrl || await getApiUrl();
    const url = `${baseUrl}/${endpoint}`;

    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Hamlet-Source': 'extension'
        };

        // Include host key header if provided
        if (hostKey) {
            headers['X-Hamlet-Host-Key'] = hostKey;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        const responseText = await response.text();
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
