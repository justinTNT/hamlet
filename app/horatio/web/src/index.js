import { Elm } from './Main.elm';
import {
    createRichTextEditor,
    destroyRichTextEditor,
    getEditor,
    createRichTextViewer,
    destroyRichTextViewer
} from 'hamlet-server/rich-text';
import 'hamlet-server/rich-text/styles.css';

console.log("Horatio Client v1.0.0");

async function run() {
    console.log("About to initialize Elm app...");

    // Read host-specific config from window.GLOBAL_CONFIG (set in host's index.html)
    const globalConfig = window.GLOBAL_CONFIG;
    console.log("Using GlobalConfig:", globalConfig);

    const app = Elm.Main.init({
        node: document.getElementById('app'),
        flags: globalConfig
    });

    console.log("Elm app created:", !!app);
    
    // Make app available in console for debugging
    window.app = app;
    console.log('Elm app initialized and assigned to window.app');

    // Connect storage ports for guest sessions
    if (app.ports && app.ports.saveGuestSession) {
        app.ports.saveGuestSession.subscribe(function(guestSession) {
            console.log('Saving guest session:', guestSession);
            localStorage.setItem('guest_session', JSON.stringify(guestSession));
        });
    }

    if (app.ports && app.ports.loadGuestSession) {
        app.ports.loadGuestSession.subscribe(function() {
            console.log('Loading guest session...');
            const saved = localStorage.getItem('guest_session');
            const guestSession = saved ? JSON.parse(saved) : null;
            console.log('Loaded guest session:', guestSession);
            app.ports.guestsessionLoaded.send(guestSession);
        });
    }
    
    // Trigger initial load of guest session
    setTimeout(() => {
        if (app.ports && app.ports.guestsessionLoaded) {
            console.log('Loading guest session on app start...');
            const saved = localStorage.getItem('guest_session');
            const guestSession = saved ? JSON.parse(saved) : null;
            console.log('Loaded guest session:', guestSession);
            app.ports.guestsessionLoaded.send(guestSession);
        }
    }, 100);

    if (app.ports && app.ports.log) {
        app.ports.log.subscribe((message) => {
            console.log("ELM:", message);
        });
    }

    // Connect to Server-Sent Events for real-time updates
    if (app.ports && app.ports.sseEvent) {
        console.log('📡 Setting up SSE connection...');
        const eventSource = new EventSource('/events');

        eventSource.onopen = function() {
            console.log('📡 SSE connection opened');
        };

        eventSource.onerror = function(error) {
            console.error('📡 SSE connection error:', error);
        };

        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('📡 SSE event received:', data);

                // Send to Elm via port
                app.ports.sseEvent.send(data);
            } catch (error) {
                console.error('📡 Error parsing SSE event:', error);
            }
        };

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            eventSource.close();
        });
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

                const encodedBody = JSON.stringify(body);
                console.log("Encoded request:", encodedBody);

                // ** REAL NETWORK CALL **
                fetch(`/api/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Session managed via cookies, no manual header needed
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
                        app.ports.rpcResponse.send({
                            endpoint,
                            body: wireResponse,
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

    // Tiptap comment editor ports - using shared hamlet-server rich-text
    const COMMENT_EDITOR_ID = 'comment-editor';

    if (app.ports && app.ports.initCommentEditor) {
        app.ports.initCommentEditor.subscribe(function(elementId) {
            requestAnimationFrame(() => {
                createRichTextEditor({
                    elementId: elementId,
                    initialContent: '',
                    onChange: null // We'll get content on demand
                });
                console.log('Comment editor initialized with shared hamlet-server rich-text');
            });
        });
    }

    if (app.ports && app.ports.getCommentEditorContent) {
        app.ports.getCommentEditorContent.subscribe(function() {
            const editor = getEditor(COMMENT_EDITOR_ID);
            if (editor) {
                const json = JSON.stringify(editor.getJSON());
                app.ports.commentEditorContent.send(json);
            } else {
                app.ports.commentEditorContent.send('');
            }
        });
    }

    if (app.ports && app.ports.clearCommentEditor) {
        app.ports.clearCommentEditor.subscribe(function() {
            const editor = getEditor(COMMENT_EDITOR_ID);
            if (editor) {
                editor.commands.clearContent();
            }
        });
    }

    // Destroy comment editor - called when canceling reply or after submit
    if (app.ports && app.ports.destroyCommentEditor) {
        app.ports.destroyCommentEditor.subscribe(function() {
            destroyRichTextEditor(COMMENT_EDITOR_ID);
            console.log('Comment editor destroyed');
        });
    }

    // Rich text viewer ports - for displaying formatted content
    if (app.ports && app.ports.initRichTextViewers) {
        app.ports.initRichTextViewers.subscribe(function(viewers) {
            requestAnimationFrame(() => {
                viewers.forEach(({ elementId, content }) => {
                    // Only initialize if the element exists and has content
                    if (document.getElementById(elementId) && content) {
                        createRichTextViewer({ elementId, content });
                    }
                });
                console.log(`Initialized ${viewers.length} rich text viewers`);
            });
        });
    }

    if (app.ports && app.ports.destroyRichTextViewers) {
        app.ports.destroyRichTextViewers.subscribe(function(elementIds) {
            elementIds.forEach(destroyRichTextViewer);
            console.log(`Destroyed ${elementIds.length} rich text viewers`);
        });
    }

    // Note: commentEditorCommand port is no longer needed - toolbar is built into the editor
}

run();
