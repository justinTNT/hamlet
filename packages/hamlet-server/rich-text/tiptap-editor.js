/**
 * TipTap Rich Text Editor Wrapper
 *
 * Provides a shared rich text editor that can be used across multiple apps
 * (admin, web, extension). Uses TipTap with comprehensive formatting options.
 */

import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'

const editors = new Map()

// Predefined colors for text and highlight
const TEXT_COLORS = [
    { name: 'Default', value: null },
    { name: 'Red', value: '#dc3545' },
    { name: 'Orange', value: '#fd7e14' },
    { name: 'Green', value: '#28a745' },
    { name: 'Blue', value: '#007bff' },
    { name: 'Purple', value: '#6f42c1' },
    { name: 'Gray', value: '#6c757d' },
]

const HIGHLIGHT_COLORS = [
    { name: 'None', value: null },
    { name: 'Yellow', value: '#fff3cd' },
    { name: 'Green', value: '#d4edda' },
    { name: 'Blue', value: '#cce5ff' },
    { name: 'Pink', value: '#f8d7da' },
    { name: 'Purple', value: '#e2d9f3' },
]

/**
 * Creates a dropdown for color selection
 */
function createColorDropdown(editor, type, colors, container) {
    const wrapper = document.createElement('div')
    wrapper.className = 'hamlet-rt-dropdown'

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'hamlet-rt-btn hamlet-rt-dropdown-btn'
    button.title = type === 'text' ? 'Text Color' : 'Highlight'
    button.innerHTML = type === 'text' ? 'A' : '<span class="highlight-icon">█</span>'

    const dropdown = document.createElement('div')
    dropdown.className = 'hamlet-rt-dropdown-menu'
    dropdown.style.display = 'none'

    colors.forEach(color => {
        const option = document.createElement('button')
        option.type = 'button'
        option.className = 'hamlet-rt-color-option'
        option.title = color.name
        if (color.value) {
            option.style.backgroundColor = color.value
            if (type === 'text') {
                option.style.backgroundColor = 'white'
                option.style.color = color.value
                option.textContent = 'A'
            }
        } else {
            option.textContent = type === 'text' ? 'A' : '∅'
            option.style.fontSize = '12px'
        }
        option.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (type === 'text') {
                if (color.value) {
                    editor.chain().focus().setColor(color.value).run()
                } else {
                    editor.chain().focus().unsetColor().run()
                }
            } else {
                if (color.value) {
                    editor.chain().focus().setHighlight({ color: color.value }).run()
                } else {
                    editor.chain().focus().unsetHighlight().run()
                }
            }
            dropdown.style.display = 'none'
        }
        dropdown.appendChild(option)
    })

    button.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        // Close other dropdowns
        container.querySelectorAll('.hamlet-rt-dropdown-menu').forEach(d => {
            if (d !== dropdown) d.style.display = 'none'
        })
        dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none'
    }

    wrapper.appendChild(button)
    wrapper.appendChild(dropdown)
    return wrapper
}

/**
 * Creates the toolbar with all formatting options.
 */
function createToolbar(editor, container) {
    const toolbar = document.createElement('div')
    toolbar.className = 'hamlet-rt-toolbar'

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!toolbar.contains(e.target)) {
            toolbar.querySelectorAll('.hamlet-rt-dropdown-menu').forEach(d => {
                d.style.display = 'none'
            })
        }
    })

    const buttonGroups = [
        // Text formatting
        [
            { label: 'B', cmd: () => editor.chain().focus().toggleBold().run(), active: () => editor.isActive('bold'), title: 'Bold (Ctrl+B)' },
            { label: 'I', cmd: () => editor.chain().focus().toggleItalic().run(), active: () => editor.isActive('italic'), title: 'Italic (Ctrl+I)' },
            { label: '{ }', cmd: () => editor.chain().focus().toggleCode().run(), active: () => editor.isActive('code'), title: 'Inline Code', className: 'code-btn' },
            { label: '🔗', cmd: () => {
                const url = window.prompt('Enter URL:')
                if (url) {
                    editor.chain().focus().setLink({ href: url }).run()
                } else if (url === '') {
                    editor.chain().focus().unsetLink().run()
                }
            }, active: () => editor.isActive('link'), title: 'Link' },
        ],
        // Headings
        [
            { label: 'H1', cmd: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: () => editor.isActive('heading', { level: 1 }), title: 'Heading 1' },
            { label: 'H2', cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor.isActive('heading', { level: 2 }), title: 'Heading 2' },
            { label: 'H3', cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: () => editor.isActive('heading', { level: 3 }), title: 'Heading 3' },
        ],
        // Lists and blocks
        [
            { label: '•', cmd: () => editor.chain().focus().toggleBulletList().run(), active: () => editor.isActive('bulletList'), title: 'Bullet List' },
            { label: '1.', cmd: () => editor.chain().focus().toggleOrderedList().run(), active: () => editor.isActive('orderedList'), title: 'Numbered List' },
            { label: '"', cmd: () => editor.chain().focus().toggleBlockquote().run(), active: () => editor.isActive('blockquote'), title: 'Quote' },
        ],
        // Text alignment - using CSS-based line icons
        [
            { label: '<span class="align-icon align-icon-left"></span>', cmd: () => editor.chain().focus().setTextAlign('left').run(), active: () => editor.isActive({ textAlign: 'left' }), title: 'Align Left' },
            { label: '<span class="align-icon align-icon-center"></span>', cmd: () => editor.chain().focus().setTextAlign('center').run(), active: () => editor.isActive({ textAlign: 'center' }), title: 'Align Center' },
            { label: '<span class="align-icon align-icon-right"></span>', cmd: () => editor.chain().focus().setTextAlign('right').run(), active: () => editor.isActive({ textAlign: 'right' }), title: 'Align Right' },
            { label: '<span class="align-icon align-icon-justify"></span>', cmd: () => editor.chain().focus().setTextAlign('justify').run(), active: () => editor.isActive({ textAlign: 'justify' }), title: 'Justify' },
        ],
    ]

    // Add button groups with separators
    buttonGroups.forEach((group, groupIndex) => {
        group.forEach((btn, i) => {
            const button = document.createElement('button')
            button.type = 'button'
            button.innerHTML = btn.label
            button.title = btn.title
            button.className = 'hamlet-rt-btn' + (btn.className ? ' ' + btn.className : '')
            button.dataset.groupIndex = groupIndex
            button.dataset.index = i
            button.onclick = (e) => {
                e.preventDefault()
                btn.cmd()
            }
            toolbar.appendChild(button)
        })

        // Add separator between groups (except after last group)
        if (groupIndex < buttonGroups.length - 1) {
            const separator = document.createElement('span')
            separator.className = 'hamlet-rt-separator'
            toolbar.appendChild(separator)
        }
    })

    // Add color dropdowns
    const separator = document.createElement('span')
    separator.className = 'hamlet-rt-separator'
    toolbar.appendChild(separator)

    toolbar.appendChild(createColorDropdown(editor, 'text', TEXT_COLORS, toolbar))
    toolbar.appendChild(createColorDropdown(editor, 'highlight', HIGHLIGHT_COLORS, toolbar))

    // Update button active states on selection change
    const updateActiveStates = () => {
        toolbar.querySelectorAll('.hamlet-rt-btn:not(.hamlet-rt-dropdown-btn)').forEach((b) => {
            const groupIdx = parseInt(b.dataset.groupIndex, 10)
            const idx = parseInt(b.dataset.index, 10)
            if (!isNaN(groupIdx) && !isNaN(idx) && buttonGroups[groupIdx] && buttonGroups[groupIdx][idx]) {
                b.classList.toggle('active', buttonGroups[groupIdx][idx].active())
            }
        })
    }

    editor.on('selectionUpdate', updateActiveStates)
    editor.on('transaction', updateActiveStates)

    container.appendChild(toolbar)
}

/**
 * Creates a TipTap rich text editor in the specified container.
 *
 * @param {Object} options
 * @param {string} options.elementId - The ID of the container element
 * @param {string} options.initialContent - Initial content as JSON string (ProseMirror format)
 * @param {function} options.onChange - Callback when content changes, receives JSON string
 * @returns {Editor|null} The TipTap editor instance, or null if container not found
 */
export function createRichTextEditor({ elementId, initialContent, onChange }) {
    const container = document.getElementById(elementId)
    if (!container) {
        console.warn(`[hamlet-rt] Container not found: ${elementId}`)
        return null
    }

    // Destroy existing editor if any
    destroyRichTextEditor(elementId)

    const editorEl = document.createElement('div')
    editorEl.className = 'hamlet-rt-content'

    // Parse initial content
    let content = { type: 'doc', content: [{ type: 'paragraph' }] }
    if (initialContent) {
        try {
            content = JSON.parse(initialContent)
        } catch (e) {
            console.warn(`[hamlet-rt] Failed to parse initial content:`, e)
        }
    }

    const editor = new Editor({
        element: editorEl,
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'hamlet-rt-link',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(JSON.stringify(editor.getJSON()))
            }
        }
    })

    container.classList.add('hamlet-rt-editor')
    createToolbar(editor, container)
    container.appendChild(editorEl)

    editors.set(elementId, editor)
    return editor
}

/**
 * Destroys a TipTap editor instance.
 *
 * @param {string} elementId - The ID of the container element
 */
export function destroyRichTextEditor(elementId) {
    const editor = editors.get(elementId)
    if (editor) {
        editor.destroy()
        editors.delete(elementId)
    }
    const container = document.getElementById(elementId)
    if (container) {
        container.innerHTML = ''
        container.classList.remove('hamlet-rt-editor')
    }
}

/**
 * Gets an existing editor instance by element ID.
 *
 * @param {string} elementId - The ID of the container element
 * @returns {Editor|undefined} The editor instance, or undefined if not found
 */
export function getEditor(elementId) {
    return editors.get(elementId)
}

/**
 * Updates the content of an existing editor.
 *
 * @param {string} elementId - The ID of the container element
 * @param {string} content - New content as JSON string
 */
export function setEditorContent(elementId, content) {
    const editor = editors.get(elementId)
    if (editor && content) {
        try {
            const parsed = JSON.parse(content)
            editor.commands.setContent(parsed)
        } catch (e) {
            console.warn(`[hamlet-rt] Failed to set content:`, e)
        }
    }
}

// Store for viewer instances (separate from editors)
const viewers = new Map()

/**
 * Creates a read-only TipTap viewer for displaying rich content.
 * No toolbar, not editable - just renders the content with full formatting.
 *
 * @param {Object} options
 * @param {string} options.elementId - The ID of the container element
 * @param {string} options.content - Content as JSON string (ProseMirror format)
 * @returns {Editor|null} The TipTap editor instance (read-only), or null if container not found
 */
export function createRichTextViewer({ elementId, content }) {
    const container = document.getElementById(elementId)
    if (!container) {
        console.warn(`[hamlet-rt] Viewer container not found: ${elementId}`)
        return null
    }

    // Destroy existing viewer if any
    destroyRichTextViewer(elementId)

    // Parse content
    let parsedContent = { type: 'doc', content: [{ type: 'paragraph' }] }
    if (content) {
        try {
            parsedContent = JSON.parse(content)
        } catch (e) {
            console.warn(`[hamlet-rt] Failed to parse viewer content:`, e)
        }
    }

    const viewer = new Editor({
        element: container,
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: true,
                HTMLAttributes: {
                    class: 'hamlet-rt-link',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content: parsedContent,
        editable: false,
    })

    container.classList.add('hamlet-rt-viewer')
    viewers.set(elementId, viewer)
    return viewer
}

/**
 * Destroys a TipTap viewer instance.
 *
 * @param {string} elementId - The ID of the container element
 */
export function destroyRichTextViewer(elementId) {
    const viewer = viewers.get(elementId)
    if (viewer) {
        viewer.destroy()
        viewers.delete(elementId)
    }
    const container = document.getElementById(elementId)
    if (container) {
        container.innerHTML = ''
        container.classList.remove('hamlet-rt-viewer')
    }
}

/**
 * Updates the content of an existing viewer.
 *
 * @param {string} elementId - The ID of the container element
 * @param {string} content - New content as JSON string
 */
export function setViewerContent(elementId, content) {
    const viewer = viewers.get(elementId)
    if (viewer && content) {
        try {
            const parsed = JSON.parse(content)
            viewer.commands.setContent(parsed)
        } catch (e) {
            console.warn(`[hamlet-rt] Failed to set viewer content:`, e)
        }
    }
}
