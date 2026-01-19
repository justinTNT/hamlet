/**
 * BuildAmp Core
 * Re-exports core utilities
 */

export * from './paths.js';
// Use tree-sitter based parser for proper AST parsing
export * from './elm-parser-ts.js';
// Legacy parser still available for backwards compatibility
export * as legacyParser from './elm-parser.js';
