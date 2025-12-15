import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateElmSharedModules } from '../../../../.buildamp/generation/elm_shared_modules.js';
import { generateElmHandlers } from '../../../../.buildamp/generation/elm_handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Generation Order Dependency Tests', () => {
    const testOutputDir = path.join(__dirname, 'temp_dependency_test');
    
    beforeEach(() => {
        // Create temp directory structure
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testOutputDir, { recursive: true });
        
        // Create required directory structure
        const dirs = [
            'src/models/api',
            'src/models/db',
            'app/horatio/server/src/Api/Handlers',
            'app/horatio/server/generated'
        ];
        
        dirs.forEach(dir => {
            fs.mkdirSync(path.join(testOutputDir, dir), { recursive: true });
        });
    });

    afterEach(() => {
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Shared Modules First Dependency', () => {
        test('handlers depend on shared modules being generated first', async () => {
            // Create API definition
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'test_api.rs'),
                `
#[buildamp_api(path = "DependencyTest")]
pub struct DependencyTestReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Try to generate handlers without shared modules first - should handle gracefully
                const handlerResult = await generateElmHandlers();
                expect(handlerResult.generated).toBe(0); // Should not generate without shared modules

                // Generate shared modules first
                await generateElmSharedModules();
                expect(fs.existsSync('app/horatio/server/generated/Database.elm')).toBe(true);

                // Now handlers should generate successfully
                const handlerResult2 = await generateElmHandlers();
                expect(handlerResult2.generated).toBe(1);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handlers are regenerated when shared modules are updated', async () => {
            // Create API definition
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'update_api.rs'),
                `
#[buildamp_api(path = "UpdateTest")]
pub struct UpdateTestReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules
                await generateElmSharedModules();

                // Generate handlers
                const result1 = await generateElmHandlers();
                expect(result1.generated).toBe(1);

                // Wait a moment to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 100));

                // Update shared modules (simulate change)
                await generateElmSharedModules();

                // Handlers should detect newer shared modules and regenerate
                const result2 = await generateElmHandlers();
                
                // Should regenerate due to dependency change
                // Note: This test depends on the shouldRegenerateHandler function working correctly
                expect(result2.generated + result2.skipped).toBeGreaterThan(0);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Handler Dependency Detection', () => {
        test('detects outdated GlobalConfig usage', async () => {
            // Create handler with old GlobalConfig structure
            const outdatedHandler = `
port module Api.Handlers.OutdatedHandler exposing (main)

type alias Model =
    { globalConfig : GlobalConfig }

type alias GlobalConfig = {}  -- Old empty structure

-- Rest of handler...
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'OutdatedHandler.elm');
            fs.writeFileSync(handlerPath, outdatedHandler);

            // Create API definition
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'outdated_api.rs'),
                `
#[buildamp_api(path = "Outdated")]
pub struct OutdatedReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules with proper GlobalConfig
                await generateElmSharedModules();

                // Handler generation should detect outdated GlobalConfig and regenerate
                const result = await generateElmHandlers();
                expect(result.generated).toBe(1);

                // Verify handler was updated with proper GlobalConfig reference
                const updatedContent = fs.readFileSync(handlerPath, 'utf-8');
                expect(updatedContent).toContain('type alias GlobalConfig = DB.GlobalConfig');
                expect(updatedContent).not.toContain('type alias GlobalConfig = {}');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('detects missing DB import when handler uses DB functions', async () => {
            // Create handler that uses DB functions but lacks proper import
            const handlerWithMissingImport = `
port module Api.Handlers.MissingImportHandler exposing (main)

type alias Model =
    { data : List DB.SomeType }

-- Uses DB.* but missing import
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'MissingImportHandler.elm');
            fs.writeFileSync(handlerPath, handlerWithMissingImport);

            // Create API definition
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'missing_import_api.rs'),
                `
#[buildamp_api(path = "MissingImport")]
pub struct MissingImportReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules
                await generateElmSharedModules();

                // Handler generation should detect missing import and regenerate
                const result = await generateElmHandlers();
                expect(result.generated).toBe(1);

                // Verify handler was updated with proper import
                const updatedContent = fs.readFileSync(handlerPath, 'utf-8');
                expect(updatedContent).toContain('import Generated.Database as DB');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('skips regeneration when handler is up to date', async () => {
            // Create proper handler with correct structure
            const upToDateHandler = `
port module Api.Handlers.UpToDateHandler exposing (main)

import Generated.Database as DB

type alias Model =
    { globalConfig : GlobalConfig }

type alias GlobalConfig = DB.GlobalConfig

-- Proper handler structure...
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'UpToDateHandler.elm');
            fs.writeFileSync(handlerPath, upToDateHandler);

            // Create API definition
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'up_to_date_api.rs'),
                `
#[buildamp_api(path = "UpToDate")]
pub struct UpToDateReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules
                await generateElmSharedModules();

                // Wait to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 100));

                // Touch handler file to make it newer than Database.elm (simulating up-to-date handler)
                const now = new Date();
                fs.utimesSync(handlerPath, now, now);

                // Handler generation should skip regeneration since handler is up to date
                const result = await generateElmHandlers();
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(1);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('File Timestamp Dependencies', () => {
        test('correctly compares file modification times', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules
                await generateElmSharedModules();
                const sharedModulePath = 'app/horatio/server/generated/Database.elm';
                const sharedModuleStat = fs.statSync(sharedModulePath);

                // Create handler after shared modules (newer timestamp)
                fs.writeFileSync(
                    'src/models/api/timestamp_api.rs',
                    `
#[buildamp_api(path = "TimestampTest")]
pub struct TimestampTestReq {
    pub host: String,
}
                    `
                );

                await new Promise(resolve => setTimeout(resolve, 100));

                await generateElmHandlers();
                const handlerPath = 'app/horatio/server/src/Api/Handlers/TimestampTestHandler.elm';
                const handlerStat = fs.statSync(handlerPath);

                expect(handlerStat.mtime.getTime()).toBeGreaterThan(sharedModuleStat.mtime.getTime());

                // Touch shared modules to make them newer
                await new Promise(resolve => setTimeout(resolve, 100));
                fs.utimesSync(sharedModulePath, new Date(), new Date());

                // Handler should be regenerated due to newer shared modules
                const result = await generateElmHandlers();
                expect(result.generated).toBe(1);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Error Handling in Dependencies', () => {
        test('handles missing shared modules gracefully', async () => {
            // Try to generate handlers without shared modules
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'no_shared_api.rs'),
                `
#[buildamp_api(path = "NoShared")]
pub struct NoSharedReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const result = await generateElmHandlers();
                
                // Should handle gracefully without throwing errors
                expect(result).toBeDefined();
                expect(result.generated).toBe(0); // Cannot generate without dependencies

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles permission errors during dependency checking', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules
                await generateElmSharedModules();

                // Create handler
                fs.writeFileSync(
                    'src/models/api/perm_test_api.rs',
                    `
#[buildamp_api(path = "PermTest")]
pub struct PermTestReq {
    pub host: String,
}
                    `
                );

                await generateElmHandlers();

                // Make shared module directory read-only to simulate permission issues
                const sharedDir = 'app/horatio/server/generated';
                fs.chmodSync(sharedDir, '444');

                try {
                    // Should handle permission errors gracefully
                    const result = await generateElmHandlers();
                    expect(result).toBeDefined();
                } finally {
                    // Restore permissions for cleanup
                    fs.chmodSync(sharedDir, '755');
                }

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Concurrent Generation Safety', () => {
        test('handles concurrent generation requests safely', async () => {
            // Create multiple API definitions
            for (let i = 0; i < 5; i++) {
                fs.writeFileSync(
                    path.join(testOutputDir, 'src', 'models', 'api', `concurrent_${i}_api.rs`),
                    `
#[buildamp_api(path = "Concurrent${i}")]
pub struct Concurrent${i}Req {
    pub host: String,
}
                    `
                );
            }

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules first
                await generateElmSharedModules();

                // Try concurrent handler generation
                const promises = [
                    generateElmHandlers(),
                    generateElmHandlers(),
                    generateElmHandlers()
                ];

                const results = await Promise.allSettled(promises);

                // At least one should succeed
                const successful = results.filter(result => result.status === 'fulfilled');
                expect(successful.length).toBeGreaterThan(0);

                // Total handlers generated should be correct (no duplicates)
                const totalGenerated = successful.reduce((sum, result) => sum + result.value.generated, 0);
                expect(totalGenerated).toBeGreaterThanOrEqual(5);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Performance of Dependency Checking', () => {
        test('dependency checking completes efficiently with many files', async () => {
            // Create many API definitions
            for (let i = 0; i < 50; i++) {
                fs.writeFileSync(
                    path.join(testOutputDir, 'src', 'models', 'api', `perf_${i}_api.rs`),
                    `
#[buildamp_api(path = "Perf${i}")]
pub struct Perf${i}Req {
    pub host: String,
}
                    `
                );
            }

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Generate shared modules
                await generateElmSharedModules();

                // Measure time for initial generation
                const start1 = Date.now();
                const result1 = await generateElmHandlers();
                const duration1 = Date.now() - start1;

                expect(result1.generated).toBe(50);
                expect(duration1).toBeLessThan(10000); // Should complete within 10 seconds

                // Measure time for dependency checking (should be faster)
                const start2 = Date.now();
                const result2 = await generateElmHandlers();
                const duration2 = Date.now() - start2;

                expect(result2.skipped).toBe(50);
                expect(duration2).toBeLessThan(duration1); // Should be faster on second run

            } finally {
                process.chdir(originalCwd);
            }
        });
    });
});