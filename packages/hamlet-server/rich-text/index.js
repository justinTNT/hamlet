/**
 * Hamlet Rich Text Editor
 *
 * A shared TipTap-based rich text editor for use across Hamlet applications.
 *
 * Usage:
 *   import { createRichTextEditor, destroyRichTextEditor } from 'hamlet-server/rich-text'
 *   import 'hamlet-server/rich-text/styles.css'
 */

export {
    createRichTextEditor,
    destroyRichTextEditor,
    getEditor,
    setEditorContent,
    createRichTextViewer,
    destroyRichTextViewer,
    setViewerContent
} from './tiptap-editor.js'
