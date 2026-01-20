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

    // Handle RichContent HTML parsing
    if (app.ports && app.ports.parseHtmlToRichContent) {
        app.ports.parseHtmlToRichContent.subscribe(({ fieldName, html }) => {
            console.log('Parsing HTML to RichContent:', { fieldName, html: html.substring(0, 100) + '...' });

            const json = htmlToRichContent(html);
            console.log('Parsed RichContent:', json.substring(0, 100) + '...');

            app.ports.richContentParsed.send({ fieldName, json });
        });
    }

    // Rich content editor keyboard shortcuts (Ctrl+B, Ctrl+I)
    document.addEventListener('keydown', (e) => {
        // Check if we're in a contenteditable element (could be the editor or a child)
        const editor = e.target.closest('.rich-content-editor');
        if (!editor) return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        if (modKey && e.key === 'b') {
            e.preventDefault();
            document.execCommand('bold', false, null);
        } else if (modKey && e.key === 'i') {
            e.preventDefault();
            document.execCommand('italic', false, null);
        }
    });

    console.log('Admin interface ready');
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