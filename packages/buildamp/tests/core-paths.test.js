/**
 * BuildAmp Core Paths Tests
 * Tests for path discovery and project detection
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

describe('Core Paths Module', () => {
    test('getActiveApp returns a string', async () => {
        const { getActiveApp } = await import('../core/paths.js');

        const appName = getActiveApp();
        assert.strictEqual(typeof appName, 'string', 'getActiveApp should return a string');
        assert.ok(appName.length > 0, 'app name should not be empty');
    });

    test('getActiveApp respects HAMLET_APP environment variable', async () => {
        const { getActiveApp } = await import('../core/paths.js');

        const originalEnv = process.env.HAMLET_APP;
        process.env.HAMLET_APP = 'test-app-name';

        try {
            const appName = getActiveApp();
            assert.strictEqual(appName, 'test-app-name', 'should use HAMLET_APP env var');
        } finally {
            if (originalEnv !== undefined) {
                process.env.HAMLET_APP = originalEnv;
            } else {
                delete process.env.HAMLET_APP;
            }
        }
    });

    test('discoverProjectPaths returns expected structure', async () => {
        const { discoverProjectPaths } = await import('../core/paths.js');

        const paths = discoverProjectPaths();

        // Check required properties exist
        assert.ok('appName' in paths, 'should have appName');
        assert.ok('modelsDir' in paths, 'should have modelsDir');
        assert.ok('dbModelsDir' in paths, 'should have dbModelsDir');
        assert.ok('apiModelsDir' in paths, 'should have apiModelsDir');
        assert.ok('storageModelsDir' in paths, 'should have storageModelsDir');
        assert.ok('kvModelsDir' in paths, 'should have kvModelsDir');
        assert.ok('sseModelsDir' in paths, 'should have sseModelsDir');
        assert.ok('eventsModelsDir' in paths, 'should have eventsModelsDir');
        assert.ok('configModelsDir' in paths, 'should have configModelsDir');

        // Check output paths
        assert.ok('elmGlueDir' in paths, 'should have elmGlueDir');
        assert.ok('jsGlueDir' in paths, 'should have jsGlueDir');
        assert.ok('elmApiDir' in paths, 'should have elmApiDir');
        assert.ok('serverHandlersDir' in paths, 'should have serverHandlersDir');
    });

    test('discoverProjectPaths detects hamlet project structure', async () => {
        const { discoverProjectPaths } = await import('../core/paths.js');

        const paths = discoverProjectPaths();

        // In the hamlet monorepo, should detect app/horatio structure
        if (paths.appName === 'horatio') {
            assert.ok(paths.modelsDir.includes('app/horatio/models'), 'modelsDir should be in app/horatio');
            assert.ok(paths.dbModelsDir.includes('models/db'), 'dbModelsDir should include models/db');
        }
    });

    test('isBuildAmpProject returns boolean', async () => {
        const { isBuildAmpProject } = await import('../core/paths.js');

        const result = isBuildAmpProject();
        assert.strictEqual(typeof result, 'boolean', 'isBuildAmpProject should return boolean');
    });

    test('getContractsPath returns valid path', async () => {
        const { discoverProjectPaths, getContractsPath } = await import('../core/paths.js');

        const projectPaths = discoverProjectPaths();
        const contractsPath = getContractsPath(projectPaths);

        assert.strictEqual(typeof contractsPath, 'string', 'contractsPath should be a string');
        assert.ok(contractsPath.endsWith('contracts.json'), 'should end with contracts.json');
    });

    test('HAMLET_GEN_DIR constant is correct', async () => {
        const { HAMLET_GEN_DIR } = await import('../core/paths.js');

        assert.strictEqual(HAMLET_GEN_DIR, '.hamlet-gen', 'HAMLET_GEN_DIR should be .hamlet-gen');
    });
});
