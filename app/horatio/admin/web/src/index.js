import { Elm } from './Main.elm';
import { connectStoragePorts } from './.generated/browser-storage.js';

console.log("Horatio Admin v1.0.0");

async function run() {
    console.log("Initializing admin interface...");

    const app = Elm.Main.init({
        node: document.getElementById('app'),
        flags: {
            adminToken: getAdminToken(),
            baseUrl: '/admin/api',
            basePath: '/admin/ui'
        }
    });

    console.log("Admin app created:", !!app);

    // Make app available in console for debugging
    window.adminApp = app;

    // Connect generated storage ports (AdminPreferences)
    connectStoragePorts(app);

    // Debug logging
    if (app.ports && app.ports.debugLog) {
        app.ports.debugLog.subscribe((msg) => {
            console.log('[Elm]', msg);
        });
    }

    // Handle admin API requests
    if (app.ports && app.ports.adminApiRequest) {
        app.ports.adminApiRequest.subscribe(async ({ method, endpoint, body, correlationId }) => {
            try {
                console.log('Admin API request:', { method, endpoint, body, correlationId });
                console.log('Full URL will be:', `/admin/api/${endpoint}`);
                
                const url = `/admin/api/${endpoint}`;
                const options = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAdminToken()}`
                    }
                };
                
                if (body && (method === 'POST' || method === 'PUT')) {
                    options.body = JSON.stringify(body);
                }
                
                const response = await fetch(url, options);

                // Handle 204 No Content (DELETE success)
                let responseData = null;
                if (response.status !== 204) {
                    responseData = await response.json();
                }

                if (!response.ok) {
                    throw new Error(responseData?.error || `HTTP ${response.status}`);
                }
                
                console.log('Admin API response:', responseData);
                console.log('Sending to Elm:', {
                    correlationId,
                    success: true,
                    data: responseData
                });
                
                try {
                    app.ports.adminApiResponse.send({
                        correlationId: String(correlationId),
                        success: Boolean(true),
                        data: responseData,
                        error: null
                    });
                    console.log('Successfully sent to Elm');
                } catch (elmError) {
                    console.error('Error sending to Elm port:', elmError);
                    console.error('Failed data:', responseData);
                    console.error('correlationId type:', typeof correlationId);
                    
                    // Try sending with null data to isolate the issue
                    try {
                        app.ports.adminApiResponse.send({
                            correlationId: String(correlationId),
                            success: false,
                            data: null,
                            error: 'Data type error - see console'
                        });
                    } catch (fallbackError) {
                        console.error('Even fallback failed:', fallbackError);
                    }
                }
                
            } catch (error) {
                console.error('Admin API error:', error);
                
                app.ports.adminApiResponse.send({
                    correlationId: String(correlationId),
                    success: false,
                    data: null,
                    error: error.message
                });
            }
        });
    }
    
    // Handle authentication
    if (app.ports && app.ports.setAdminToken) {
        app.ports.setAdminToken.subscribe((token) => {
            localStorage.setItem('admin_token', token);
            console.log('Admin token saved');
        });
    }

    console.log('Admin interface ready');
}

function getAdminToken() {
    // Try multiple sources for admin token
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('admin_token');
    
    if (tokenFromUrl) {
        localStorage.setItem('admin_token', tokenFromUrl);
        return tokenFromUrl;
    }
    
    return localStorage.getItem('admin_token') || '';
}

run();