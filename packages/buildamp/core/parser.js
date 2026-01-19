/**
 * BuildAmp Elm Parser
 *
 * Re-exports the tree-sitter based parser as the primary parser.
 * The tree-sitter parser provides proper AST-based parsing with support for:
 * - Type aliases (record types)
 * - Union types (custom types)
 * - Nested records
 * - Type parameters
 */

export * from './elm-parser-ts.js';
export { default } from './elm-parser-ts.js';
