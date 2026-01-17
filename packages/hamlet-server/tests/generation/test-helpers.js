/**
 * Shared test configuration helpers for generation tests
 * DRYs up the repeated config patterns across test files
 */

import fs from 'fs';
import path from 'path';

/**
 * Create config for elm shared modules generation tests
 * @param {string} testOutputDir - The temp test directory
 */
export function createElmConfig(testOutputDir) {
    return {
        inputBasePath: path.join(testOutputDir, 'src', 'models'),
        backendElmPath: testOutputDir
    };
}

/**
 * Create config for handler generation tests
 * @param {string} testOutputDir - The temp test directory
 * @param {Object} overrides - Optional config overrides
 */
export function createHandlerConfig(testOutputDir, overrides = {}) {
    return {
        inputBasePath: path.join(testOutputDir, 'src', 'models'),
        handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
        projectName: 'horatio',
        backendElmPath: path.join(testOutputDir, 'src', 'generated'),
        ...overrides
    };
}

/**
 * Create config for dependency order tests
 * @param {string} testOutputDir - The temp test directory
 */
export function createDependencyConfig(testOutputDir) {
    return {
        inputBasePath: path.join(testOutputDir, 'src', 'models'),
        handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
        backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
        projectName: 'horatio'
    };
}

/**
 * Standard test directory structure for handler tests
 */
export const HANDLER_TEST_DIRS = [
    'src/models/api',
    'src/models/db',
    'app/horatio/server/src/Api/Handlers',
    'app/horatio/server/generated/Generated'
];

/**
 * Standard test directory structure for elm module tests
 */
export const ELM_TEST_DIRS = [
    'src/models/db',
    'src/models/kv',
    'src/models/events',
    'src/models/config',
    'Generated'
];

/**
 * Ensure Generated output directory exists
 * @param {string} testOutputDir - The temp test directory
 */
export function ensureGeneratedDir(testOutputDir) {
    fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
}

/**
 * Create mock db models directory and return its path
 * @param {string} testOutputDir - The temp test directory
 */
export function createMockDbDir(testOutputDir) {
    const mockDbDir = path.join(testOutputDir, 'src', 'models', 'db');
    fs.mkdirSync(mockDbDir, { recursive: true });
    return mockDbDir;
}

/**
 * Create mock kv models directory and return its path
 * @param {string} testOutputDir - The temp test directory
 */
export function createMockKvDir(testOutputDir) {
    const mockKvDir = path.join(testOutputDir, 'src', 'models', 'kv');
    fs.mkdirSync(mockKvDir, { recursive: true });
    return mockKvDir;
}
