import { Elm } from './Main.elm';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Code from '@tiptap/extension-code';
import Link from '@tiptap/extension-link';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import History from '@tiptap/extension-history';

console.log("Horatio Client v1.0.0");

// Global editor instance
let commentEditor = null;

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

    // Tiptap comment editor ports
    if (app.ports && app.ports.initCommentEditor) {
        app.ports.initCommentEditor.subscribe(function(elementId) {
            // Wait for DOM element to be ready
            requestAnimationFrame(() => {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.error('Comment editor element not found:', elementId);
                    return;
                }

                // Destroy existing editor if any
                if (commentEditor) {
                    commentEditor.destroy();
                }

                commentEditor = new Editor({
                    element: element,
                    extensions: [
                        Document,
                        Paragraph,
                        Text,
                        Bold,
                        Italic,
                        Code,
                        Link.configure({
                            openOnClick: false,
                            HTMLAttributes: {
                                rel: 'noopener noreferrer nofollow',
                            },
                        }),
                        BulletList,
                        ListItem,
                        Blockquote,
                        History,
                    ],
                    content: '',
                    editorProps: {
                        attributes: {
                            class: 'comment-editor-content',
                        },
                    },
                });

                console.log('Tiptap comment editor initialized');
            });
        });
    }

    if (app.ports && app.ports.getCommentEditorContent) {
        app.ports.getCommentEditorContent.subscribe(function() {
            if (commentEditor) {
                const json = JSON.stringify(commentEditor.getJSON());
                app.ports.commentEditorContent.send(json);
            } else {
                app.ports.commentEditorContent.send('');
            }
        });
    }

    if (app.ports && app.ports.clearCommentEditor) {
        app.ports.clearCommentEditor.subscribe(function() {
            if (commentEditor) {
                commentEditor.commands.clearContent();
            }
        });
    }

    if (app.ports && app.ports.commentEditorCommand) {
        app.ports.commentEditorCommand.subscribe(function(command) {
            if (!commentEditor) return;

            switch (command.action) {
                case 'bold':
                    commentEditor.chain().focus().toggleBold().run();
                    break;
                case 'italic':
                    commentEditor.chain().focus().toggleItalic().run();
                    break;
                case 'code':
                    commentEditor.chain().focus().toggleCode().run();
                    break;
                case 'bulletList':
                    commentEditor.chain().focus().toggleBulletList().run();
                    break;
                case 'blockquote':
                    commentEditor.chain().focus().toggleBlockquote().run();
                    break;
                case 'link':
                    // Check if there's already a link on the selection
                    if (commentEditor.isActive('link')) {
                        commentEditor.chain().focus().unsetLink().run();
                    } else {
                        const url = prompt('Enter URL:');
                        if (url) {
                            commentEditor.chain().focus().setLink({ href: url }).run();
                        }
                    }
                    break;
            }
        });
    }
}

run();
