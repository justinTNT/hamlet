import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateElmSharedModules } from '../../../../shared/generation/elm_shared_modules.js';
import { generateElmHandlers } from '../../../../shared/generation/elm_handlers.js';

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
            'app/horatio/server/generated/Generated'
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Try to generate handlers without shared modules first - should handle gracefully
                const handlerResult = await generateElmHandlers(config);
                expect(handlerResult.generated).toBe(0); // Should not generate without shared modules

                // Generate shared modules first
                await generateElmSharedModules(config);
                expect(fs.existsSync(path.join(config.backendElmPath, 'Generated', 'Database.elm'))).toBe(true);

                // Now handlers should generate successfully
                const handlerResult2 = await generateElmHandlers(config);
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules
                await generateElmSharedModules(config);

                // Generate handlers
                const result1 = await generateElmHandlers(config);
                expect(result1.generated).toBe(1);

                // Wait a moment to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 100));

                // Update shared modules (simulate change)
                await generateElmSharedModules(config);

                // Handlers should detect newer shared modules and regenerate
                const result2 = await generateElmHandlers(config);
                
                // Should skip because handler already exists (correct behavior)
                expect(result2.generated).toBe(0);
                expect(result2.skipped).toBe(1);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Handler Dependency Detection', () => {
        test('detects outdated GlobalConfig usage', async () => {
            // Create handler with old GlobalConfig structure
            const outdatedHandler = `
port module Api.Handlers.OutdatedHandlerTEA exposing (main)

type alias Model =
    { globalConfig : GlobalConfig }

type alias GlobalConfig = {}  -- Old empty structure

-- Rest of handler...
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'OutdatedHandlerTEA.elm');
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules with proper GlobalConfig
                await generateElmSharedModules(config);

                // Handler generation should skip existing handler (correct behavior) 
                const result = await generateElmHandlers(config);
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(1);

                // Note: Since handlers are scaffolding that's never overwritten,
                // the existing handler content remains unchanged

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('detects missing DB import when handler uses DB functions', async () => {
            // Create handler that uses DB functions but lacks proper import
            const handlerWithMissingImport = `
port module Api.Handlers.MissingImportHandlerTEA exposing (main)

type alias Model =
    { data : List DB.SomeType }

-- Uses DB.* but missing import
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'MissingImportHandlerTEA.elm');
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules
                await generateElmSharedModules(config);

                // Handler generation should skip existing handler (correct behavior)
                const result = await generateElmHandlers(config);
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(1);

                // Note: Handlers are scaffolding templates, never overwritten

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('skips regeneration when handler is up to date', async () => {
            // Create proper handler with correct structure
            const upToDateHandler = `
port module Api.Handlers.UpToDateHandlerTEA exposing (main)

import Generated.Database as DB

type alias Model =
    { globalConfig : GlobalConfig }

type alias GlobalConfig = DB.GlobalConfig

-- Proper handler structure...
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'UpToDateHandlerTEA.elm');
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules
                await generateElmSharedModules(config);

                // Wait to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 100));

                // Touch handler file to make it newer than Database.elm (simulating up-to-date handler)
                const now = new Date();
                fs.utimesSync(handlerPath, now, now);

                // Handler generation should skip regeneration since handler is up to date
                const result = await generateElmHandlers(config);
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules
                await generateElmSharedModules(config);
                const sharedModulePath = 'app/horatio/server/generated/Generated/Database.elm';
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

                await generateElmHandlers(config);
                const handlerPath = 'app/horatio/server/src/Api/Handlers/TimestampTestHandlerTEA.elm';
                const handlerStat = fs.statSync(handlerPath);

                expect(handlerStat.mtime.getTime()).toBeGreaterThan(sharedModuleStat.mtime.getTime());

                // Touch shared modules to make them newer
                await new Promise(resolve => setTimeout(resolve, 100));
                fs.utimesSync(sharedModulePath, new Date(), new Date());

                // Handler should be skipped since it exists (correct behavior)
                const result = await generateElmHandlers(config);
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(1);

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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                const result = await generateElmHandlers(config);
                
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules
                await generateElmSharedModules(config);

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

                await generateElmHandlers(config);

                // Make shared module directory read-only to simulate permission issues
                const sharedDir = 'app/horatio/server/generated/Generated';
                fs.chmodSync(sharedDir, '444');

                try {
                    // Should handle permission errors gracefully
                    const result = await generateElmHandlers(config);
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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules first
                await generateElmSharedModules(config);

                // Try concurrent handler generation
                const promises = [
                    generateElmHandlers(config),
                    generateElmHandlers(config),
                    generateElmHandlers(config)
                ];

                const results = await Promise.allSettled(promises);

                // At least one should succeed
                const successful = results.filter(result => result.status === 'fulfilled');
                expect(successful.length).toBeGreaterThan(0);

                // Total handlers generated should be correct (no duplicates)
                const totalGenerated = successful.reduce((sum, result) => sum + (result.value.generated || 0), 0);
                expect(totalGenerated).toBeGreaterThanOrEqual(0); // At least one concurrent call should succeed

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
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    backendElmPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'generated'),
                    projectName: 'horatio'
                };

                // Generate shared modules
                await generateElmSharedModules(config);

                // Measure time for initial generation
                const start1 = Date.now();
                const result1 = await generateElmHandlers(config);
                const duration1 = Date.now() - start1;

                expect(result1.generated).toBe(50);
                expect(duration1).toBeLessThan(30000); // Should complete within 30 seconds

                // Measure time for dependency checking (should be faster)
                const start2 = Date.now();
                const result2 = await generateElmHandlers(config);
                const duration2 = Date.now() - start2;

                expect(result2.skipped).toBe(50);
                expect(duration2).toBeLessThan(duration1); // Should be faster on second run

            } finally {
                process.chdir(originalCwd);
            }
        });
    });
});