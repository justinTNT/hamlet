/**
 * Hamlet Extension Popup Bootstrap
 *
 * Extracts page data from the active tab and initializes the Elm popup.
 * Expects window.Elm.Popup to be available (from compiled elm.js).
 * This is framework code - do not modify unless updating hamlet-extension.
 */

import { createRichTextEditor, destroyRichTextEditor, getEditor } from 'hamlet-server/rich-text';
import 'hamlet-server/rich-text/styles.css';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

const Elm = window.Elm;

console.log("Popup script loaded. Window.Elm:", window.Elm);

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Tabs query result:", tabs);
    const activeTab = tabs[0];

    if (!activeTab) {
        console.log("No active tab found.");
        initElm({
            title: "",
            url: "",
            selection: "",
            selectionHtml: "",
            images: []
        });
        return;
    }

    // Check if URL is injectable (not a protected chrome:// or extension page)
    const url = activeTab.url || "";
    const isProtectedUrl = url.startsWith('chrome://') ||
                           url.startsWith('chrome-extension://') ||
                           url.startsWith('about:') ||
                           url.startsWith('edge://') ||
                           url.startsWith('brave://') ||
                           url === '';

    if (isProtectedUrl) {
        console.log("Protected URL, skipping script injection:", url);
        initElm({
            title: activeTab.title || "",
            url: url,
            selection: "",
            selectionHtml: "",
            images: []
        });
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
            const sel = window.getSelection();
            const selection = sel.toString();
            let selectionHtml = '';
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const fragment = range.cloneContents();
                const div = document.createElement('div');
                div.appendChild(fragment);
                selectionHtml = div.innerHTML;
            }
            const images = Array.from(document.images)
                .map(img => img.src)
                .filter(src => src.startsWith('http'));
            return { selection, selectionHtml, images };
        }
    }, (results) => {
        console.log("Script execution results:", results);
        let pageData = {
            title: activeTab.title || "",
            url: activeTab.url || "",
            selection: "",
            selectionHtml: "",
            images: []
        };

        if (results && results[0] && results[0].result) {
            pageData.selection = results[0].result.selection || "";
            pageData.selectionHtml = results[0].result.selectionHtml || "";
            pageData.images = results[0].result.images || [];
        }

        initElm(pageData);
    });
});

function initElm(flags) {
    console.log("Initializing Elm with flags:", flags);
    try {
        const app = Elm.Popup.init({
            node: document.getElementById('app'),
            flags: flags
        });
        console.log("Elm initialized successfully.");
        setupPorts(app);
    } catch (e) {
        console.error("Failed to initialize Elm:", e);
    }
}

/**
 * Converts HTML string to tiptap/ProseMirror JSON using a temporary editor.
 */
function htmlToTiptapJson(html) {
    if (!html) return null;

    const tempContainer = document.createElement('div');
    tempContainer.style.display = 'none';
    document.body.appendChild(tempContainer);

    try {
        const editor = new Editor({
            element: tempContainer,
            extensions: [
                StarterKit,
                Link.configure({ openOnClick: false }),
            ],
            content: html, // tiptap accepts HTML strings directly
        });

        const json = editor.getJSON();
        editor.destroy();
        return json;
    } catch (e) {
        console.warn('Failed to convert HTML to tiptap JSON:', e);
        return null;
    } finally {
        tempContainer.remove();
    }
}

function setupPorts(app) {
    app.ports.outbound.subscribe(function (msg) {
        // Message format: { apiUrl: string, hostKey: string, payload: { endpoint, body, correlationId } }
        const { apiUrl, hostKey, payload } = msg;
        const request = {
            ...payload,
            apiUrl: apiUrl,
            hostKey: hostKey || ''
        };

        console.log("Popup sending message:", request);
        chrome.runtime.sendMessage(request, function (response) {
            console.log("Popup received response:", response);
            if (chrome.runtime.lastError) {
                console.error("Runtime error:", chrome.runtime.lastError);
                app.ports.inbound.send({
                    correlationId: payload.correlationId,
                    body: null,
                    error: chrome.runtime.lastError.message
                });
            } else {
                app.ports.inbound.send(response);
            }
        });
    });

    // Open admin UI in new tab
    app.ports.openAdmin.subscribe(function (data) {
        // data: { url: string, projectKey: string }
        // Convert API URL to admin URL: http://localhost:3000/api -> http://localhost:3000/admin
        let adminUrl = data.url.replace(/\/api\/?$/, '/admin');

        // Append project key as query param if provided
        if (data.projectKey && data.projectKey.trim() !== '') {
            adminUrl += '?project_key=' + encodeURIComponent(data.projectKey);
        }

        console.log("Opening admin URL:", adminUrl);
        chrome.tabs.create({ url: adminUrl });
    });

    app.ports.closeWindow.subscribe(function () {
        window.close();
    });

    // Host management ports
    app.ports.saveHosts.subscribe(function (hosts) {
        console.log("Saving hosts:", hosts);
        chrome.storage.local.set({ hosts: hosts }, function () {
            console.log("Hosts saved");
        });
    });

    app.ports.loadHosts.subscribe(function () {
        console.log("Loading hosts...");
        chrome.storage.local.get(['hosts'], function (result) {
            console.log("Hosts loaded:", result.hosts);
            app.ports.hostsLoaded.send(result.hosts || []);
        });
    });

    // Project key ports (single value for all hosts)
    app.ports.saveProjectKey.subscribe(function (key) {
        chrome.storage.local.set({ projectKey: key }, function () {
            console.log("Project key saved");
        });
    });

    app.ports.loadProjectKey.subscribe(function () {
        chrome.storage.local.get(['projectKey'], function (result) {
            app.ports.projectKeyLoaded.send(result.projectKey || '');
        });
    });

    // Rich text editor ports
    if (app.ports.initExtractEditor) {
        app.ports.initExtractEditor.subscribe(function (selectionHtml) {
            requestAnimationFrame(() => {
                // Convert HTML to tiptap JSON, then create editor
                let initialContent = '';
                if (selectionHtml) {
                    const json = htmlToTiptapJson(selectionHtml);
                    if (json) {
                        initialContent = JSON.stringify(json);
                    }
                }

                createRichTextEditor({
                    elementId: 'extract-editor',
                    initialContent: initialContent,
                    onChange: function (jsonString) {
                        if (app.ports.extractContentChanged) {
                            try {
                                app.ports.extractContentChanged.send(JSON.parse(jsonString));
                            } catch (e) {
                                console.warn('Failed to parse extract content:', e);
                            }
                        }
                    }
                });

                // Send initial content to Elm immediately
                if (initialContent && app.ports.extractContentChanged) {
                    try {
                        app.ports.extractContentChanged.send(JSON.parse(initialContent));
                    } catch (e) {
                        console.warn('Failed to parse initial extract content:', e);
                    }
                }

                console.log('Extract editor initialized');
            });
        });
    }

    if (app.ports.initOwnerCommentEditor) {
        app.ports.initOwnerCommentEditor.subscribe(function (_) {
            requestAnimationFrame(() => {
                createRichTextEditor({
                    elementId: 'owner-comment-editor',
                    initialContent: '',
                    onChange: function (jsonString) {
                        if (app.ports.ownerCommentContentChanged) {
                            try {
                                app.ports.ownerCommentContentChanged.send(JSON.parse(jsonString));
                            } catch (e) {
                                console.warn('Failed to parse comment content:', e);
                            }
                        }
                    }
                });
                console.log('Owner comment editor initialized');
            });
        });
    }
}
