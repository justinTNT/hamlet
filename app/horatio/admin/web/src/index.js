import { Elm } from './Main.elm';
import { connectStoragePorts } from './.generated/browser-storage.js';
import { createRichTextEditor, destroyRichTextEditor } from 'hamlet-server/rich-text';
import 'hamlet-server/rich-text/styles.css';

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

                // Handle 204 No Content (DELETE success) and empty responses
                let responseData = null;
                if (response.status !== 204) {
                    const text = await response.text();
                    if (text && text.trim()) {
                        try {
                            responseData = JSON.parse(text);
                        } catch (parseError) {
                            console.error('Failed to parse JSON response:', text.substring(0, 100));
                            throw new Error('Invalid JSON response from server');
                        }
                    }
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

    // Handle RichContent HTML parsing (legacy, kept for compatibility)
    if (app.ports && app.ports.parseHtmlToRichContent) {
        app.ports.parseHtmlToRichContent.subscribe(({ fieldName, html }) => {
            console.log('Parsing HTML to RichContent:', { fieldName, html: html.substring(0, 100) + '...' });

            const json = htmlToRichContent(html);
            console.log('Parsed RichContent:', json.substring(0, 100) + '...');

            app.ports.richContentParsed.send({ fieldName, json });
        });
    }

    // TipTap rich text editor initialization
    if (app.ports && app.ports.initRichTextEditor) {
        app.ports.initRichTextEditor.subscribe(({ fieldId, content }) => {
            console.log('[TipTap] Init editor:', fieldId);
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                createRichTextEditor({
                    elementId: fieldId,
                    initialContent: content,
                    onChange: (json) => {
                        app.ports.richTextChanged.send({ fieldId, content: json });
                    }
                });
            });
        });
    }

    // TipTap editor cleanup
    if (app.ports && app.ports.destroyRichTextEditor) {
        app.ports.destroyRichTextEditor.subscribe((fieldId) => {
            console.log('[TipTap] Destroy editor:', fieldId);
            destroyRichTextEditor(fieldId);
        });
    }

    // Host Keys management panel
    setupHostKeysPanel(app);

    console.log('Admin interface ready');
}

/**
 * Host Keys Management Panel
 * Provides CRUD for hamlet_host_keys via /admin/api/_keys
 */
function setupHostKeysPanel(app) {
    // Add a "Host Keys" button to the page that opens the panel
    const panel = document.createElement('div');
    panel.id = 'host-keys-panel';
    panel.style.cssText = 'display:none; position:fixed; top:0; right:0; width:420px; height:100vh; background:#fff; box-shadow:-2px 0 8px rgba(0,0,0,.15); z-index:1000; overflow-y:auto; padding:20px; box-sizing:border-box;';
    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0;">Host Keys</h2>
            <button id="hk-close" style="border:none; background:none; font-size:20px; cursor:pointer;">&times;</button>
        </div>
        <div style="margin-bottom:16px;">
            <input id="hk-label" type="text" placeholder="Key label (optional)" style="width:70%; padding:6px; margin-right:8px; box-sizing:border-box;">
            <button id="hk-create" style="padding:6px 14px; background:#007bff; color:#fff; border:none; cursor:pointer; border-radius:3px;">Create</button>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="text-align:left; border-bottom:2px solid #ddd;">
                    <th style="padding:6px;">Label</th>
                    <th style="padding:6px;">Key</th>
                    <th style="padding:6px;">Status</th>
                    <th style="padding:6px;"></th>
                </tr>
            </thead>
            <tbody id="hk-list"></tbody>
        </table>
    `;
    document.body.appendChild(panel);

    // Toggle button - insert after page loads
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Host Keys';
    toggleBtn.style.cssText = 'position:fixed; bottom:16px; right:16px; z-index:999; padding:8px 16px; background:#343a40; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:13px;';
    toggleBtn.onclick = () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display === 'block') loadHostKeys();
    };
    document.body.appendChild(toggleBtn);

    // Close button
    panel.querySelector('#hk-close').onclick = () => {
        panel.style.display = 'none';
    };

    // Create key
    panel.querySelector('#hk-create').onclick = async () => {
        const label = panel.querySelector('#hk-label').value.trim();
        try {
            const resp = await fetch('/admin/api/_keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAdminToken()}`
                },
                body: JSON.stringify({ label: label || null })
            });
            if (!resp.ok) throw new Error(await resp.text());
            panel.querySelector('#hk-label').value = '';
            loadHostKeys();
        } catch (err) {
            console.error('Failed to create host key:', err);
            alert('Failed to create key: ' + err.message);
        }
    };

    async function loadHostKeys() {
        const tbody = panel.querySelector('#hk-list');
        tbody.innerHTML = '<tr><td colspan="4" style="padding:6px; color:#666;">Loading...</td></tr>';

        try {
            const resp = await fetch('/admin/api/_keys', {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            if (!resp.ok) throw new Error(await resp.text());

            const keys = await resp.json();
            if (keys.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding:6px; color:#666; font-style:italic;">No keys created yet.</td></tr>';
                return;
            }

            tbody.innerHTML = keys.map(k => {
                const isRevoked = !!k.revoked_at;
                const statusBadge = isRevoked
                    ? '<span style="color:#dc3545;">Revoked</span>'
                    : '<span style="color:#28a745;">Active</span>';
                const revokeBtn = isRevoked
                    ? ''
                    : `<button class="hk-revoke" data-id="${k.id}" style="padding:3px 8px; background:#dc3545; color:#fff; border:none; cursor:pointer; border-radius:3px; font-size:12px;">Revoke</button>`;
                const keyDisplay = `<code style="font-size:11px; word-break:break-all;">${k.key}</code>`;

                return `<tr style="border-bottom:1px solid #eee;">
                    <td style="padding:6px;">${k.label || '<em style="color:#999;">none</em>'}</td>
                    <td style="padding:6px;">${keyDisplay}</td>
                    <td style="padding:6px;">${statusBadge}</td>
                    <td style="padding:6px;">${revokeBtn}</td>
                </tr>`;
            }).join('');

            // Wire revoke buttons
            tbody.querySelectorAll('.hk-revoke').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm('Revoke this key? API requests using it will be denied.')) return;
                    try {
                        const resp = await fetch(`/admin/api/_keys/${btn.dataset.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${getAdminToken()}` }
                        });
                        if (!resp.ok && resp.status !== 204) throw new Error(await resp.text());
                        loadHostKeys();
                    } catch (err) {
                        console.error('Failed to revoke key:', err);
                        alert('Failed to revoke: ' + err.message);
                    }
                };
            });
        } catch (err) {
            console.error('Failed to load host keys:', err);
            tbody.innerHTML = `<tr><td colspan="4" style="padding:6px; color:#dc3545;">Error: ${err.message}</td></tr>`;
        }
    }
}

/**
 * Convert HTML string to ProseMirror RichContent JSON format.
 * Handles: paragraphs, bold, italic, code, links, lists, blockquotes, headings.
 */
function htmlToRichContent(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;

    const content = [];

    for (const node of container.childNodes) {
        const parsed = parseNode(node);
        if (parsed) {
            content.push(parsed);
        }
    }

    // If no block-level content was found, wrap everything in a paragraph
    if (content.length === 0) {
        content.push({
            type: 'paragraph',
            content: parseInlineNodes(container)
        });
    }

    return JSON.stringify({ type: 'doc', content });
}

function parseNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        // Text nodes outside of block elements - will be handled by parent
        return null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const tagName = node.tagName.toLowerCase();

    switch (tagName) {
        case 'p':
        case 'div':
            return {
                type: 'paragraph',
                content: parseInlineNodes(node)
            };

        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            return {
                type: 'heading',
                attrs: { level: parseInt(tagName[1]) },
                content: parseInlineNodes(node)
            };

        case 'ul':
            return {
                type: 'bulletList',
                content: parseListItems(node)
            };

        case 'ol':
            return {
                type: 'orderedList',
                content: parseListItems(node)
            };

        case 'blockquote':
            return {
                type: 'blockquote',
                content: parseBlockNodes(node)
            };

        case 'br':
            // Line break - return a paragraph separator
            return null;

        default:
            // Unknown block element - treat as paragraph
            if (node.children.length > 0 || node.textContent.trim()) {
                return {
                    type: 'paragraph',
                    content: parseInlineNodes(node)
                };
            }
            return null;
    }
}

function parseListItems(listNode) {
    const items = [];
    for (const child of listNode.children) {
        if (child.tagName.toLowerCase() === 'li') {
            items.push({
                type: 'listItem',
                content: parseBlockNodes(child)
            });
        }
    }
    return items;
}

function parseBlockNodes(container) {
    const blocks = [];
    let hasBlockContent = false;

    for (const child of container.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = child.tagName.toLowerCase();
            if (['p', 'div', 'ul', 'ol', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                hasBlockContent = true;
                const parsed = parseNode(child);
                if (parsed) blocks.push(parsed);
            }
        }
    }

    // If no block content, wrap inline content in a paragraph
    if (!hasBlockContent) {
        const inlineContent = parseInlineNodes(container);
        if (inlineContent.length > 0) {
            blocks.push({
                type: 'paragraph',
                content: inlineContent
            });
        }
    }

    return blocks;
}

function parseInlineNodes(container) {
    const inlines = [];

    function traverse(node, marks = []) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text) {
                const inline = { type: 'text', text };
                if (marks.length > 0) {
                    inline.marks = marks.map(m => ({ ...m }));
                }
                inlines.push(inline);
            }
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const tagName = node.tagName.toLowerCase();
        let newMarks = [...marks];

        switch (tagName) {
            case 'strong':
            case 'b':
                newMarks.push({ type: 'bold' });
                break;
            case 'em':
            case 'i':
                newMarks.push({ type: 'italic' });
                break;
            case 'code':
                newMarks.push({ type: 'code' });
                break;
            case 'a':
                newMarks.push({ type: 'link', attrs: { href: node.getAttribute('href') || '#' } });
                break;
            case 'br':
                // Insert a newline text node
                inlines.push({ type: 'text', text: '\n' });
                return;
        }

        for (const child of node.childNodes) {
            traverse(child, newMarks);
        }
    }

    for (const child of container.childNodes) {
        traverse(child);
    }

    return inlines;
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