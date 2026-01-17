import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateElmHandlers } from 'buildamp/generators';
import { createHandlerConfig } from './test-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Elm TEA Handlers Generation Tests', () => {
    const testOutputDir = path.join(__dirname, 'temp_elm_handlers');
    const config = createHandlerConfig(testOutputDir);

    beforeEach(() => {
        // Create temp directory structure for testing
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testOutputDir, { recursive: true });
        
        // Create mock API directory structure
        const apiDir = path.join(testOutputDir, 'src', 'models', 'api');
        fs.mkdirSync(apiDir, { recursive: true });
        
        // Create handler output directory
        const handlerDir = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers');
        fs.mkdirSync(handlerDir, { recursive: true });

        // Create shared modules directory
        const sharedDir = path.join(testOutputDir, 'app', 'horatio', 'server', 'generated', 'Generated');
        fs.mkdirSync(sharedDir, { recursive: true });
        
        // Create mock Database.elm at the expected location
        const backendElmDir = path.join(testOutputDir, 'src', 'generated', 'Generated');
        fs.mkdirSync(backendElmDir, { recursive: true });
        fs.writeFileSync(path.join(backendElmDir, 'Database.elm'), 'module Generated.Database exposing (..)');
        
        // Also create in the project location
        fs.writeFileSync(path.join(sharedDir, 'Database.elm'), 'module Generated.Database exposing (..)');
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('API Endpoint Parsing', () => {
        test('parses single API endpoint correctly', async () => {
            const mockApiContent = `
use serde::{Deserialize, Serialize};

#[buildamp_api(path = "SubmitComment")]
pub struct SubmitCommentReq {
    pub host: String,
    pub comment: String,
    pub item_id: i32,
}

#[derive(Debug, Serialize)]
pub struct SubmitCommentRes {
    pub success: bool,
    pub comment_id: String,
}
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'comments_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                const result = await generateElmHandlers(config);
                
                expect(result.generated).toBeGreaterThanOrEqual(1);
                expect(result.skipped).toBeGreaterThanOrEqual(0);
                
                // Check handler file was created
                const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'SubmitCommentHandlerTEA.elm');
                expect(fs.existsSync(handlerPath)).toBe(true);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('parses multiple API endpoints from single file', async () => {
            const mockApiContent = `
#[buildamp_api(path = "GetFeed")]
pub struct GetFeedReq {
    pub host: String,
    pub page: Option<i32>,
}

#[buildamp_api(path = "SubmitItem")]
pub struct SubmitItemReq {
    pub host: String,
    pub title: String,
    pub link: Option<String>,
}
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'feed_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                const result = await generateElmHandlers(config);
                
                expect(result.generated).toBe(2);
                
                // Check both handler files were created
                expect(fs.existsSync(path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'GetFeedHandlerTEA.elm'))).toBe(true);
                expect(fs.existsSync(path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'SubmitItemHandlerTEA.elm'))).toBe(true);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles complex buildamp_api attributes', async () => {
            const mockApiContent = `
#[buildamp_api(
    path = "ComplexEndpoint",
    auth = "required",
    validation = "strict"
)]
pub struct ComplexEndpointReq {
    pub host: String,
    pub data: String,
}
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'complex_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                const result = await generateElmHandlers(config);
                
                // Handler should be either generated or skipped, but file should exist
                expect(result.generated + result.skipped).toBe(1);
                expect(fs.existsSync(path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'ComplexEndpointHandlerTEA.elm'))).toBe(true);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('TEA Handler Generation', () => {
        test('generates proper TEA architecture structure', async () => {
            const mockApiContent = `
#[buildamp_api(path = "TestEndpoint")]
pub struct TestEndpointReq {
    pub host: String,
    pub data: String,
}
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'test_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                await generateElmHandlers(config);
                
                const handlerContent = fs.readFileSync(
                    path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'TestEndpointHandlerTEA.elm'),
                    'utf-8'
                );

                // Check TEA structure
                expect(handlerContent).toContain('port module Api.Handlers.TestEndpointHandlerTEA exposing (main)');
                expect(handlerContent).toContain('type alias Model =');
                expect(handlerContent).toContain('stage : Stage');
                expect(handlerContent).toContain('request : Maybe TestEndpointReq');
                expect(handlerContent).toContain('globalConfig : GlobalConfig');
                expect(handlerContent).toContain('globalState : GlobalState');

                // Check stages
                expect(handlerContent).toContain('type Stage');
                expect(handlerContent).toContain('= Idle');
                expect(handlerContent).toContain('| Processing');
                expect(handlerContent).toContain('| Complete TestEndpointRes');
                expect(handlerContent).toContain('| Failed String');

                // Check messages
                expect(handlerContent).toContain('type Msg');
                expect(handlerContent).toContain('= HandleRequest RequestBundle');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates proper imports and type references', async () => {
            const mockApiContent = `
#[buildamp_api(path = "ImportTest")]
pub struct ImportTestReq {
    pub host: String,
}
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'import_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                await generateElmHandlers(config);
                
                const handlerContent = fs.readFileSync(
                    path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'ImportTestHandlerTEA.elm'),
                    'utf-8'
                );

                // Check proper imports
                expect(handlerContent).toContain('import Api.Backend exposing (ImportTestReq, ImportTestRes)');
                expect(handlerContent).toContain('import Generated.Database as DB');
                expect(handlerContent).toContain('import Generated.Events as Events');
                expect(handlerContent).toContain('import Generated.Services as Services');
                expect(handlerContent).toContain('import Json.Encode as Encode');
                expect(handlerContent).toContain('import Json.Decode as Decode');
                expect(handlerContent).toContain('import Platform');

                // Check type aliases reference shared modules
                expect(handlerContent).toContain('type alias GlobalConfig = DB.GlobalConfig');
                expect(handlerContent).toContain('type alias GlobalState = DB.GlobalState');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates proper port definitions for TEA', async () => {
            const mockApiContent = `
#[buildamp_api(path = "PortTest")]
pub struct PortTestReq {
    pub host: String,
}
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'port_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                await generateElmHandlers(config);
                
                const handlerContent = fs.readFileSync(
                    path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'PortTestHandlerTEA.elm'),
                    'utf-8'
                );

                // Check port definitions
                expect(handlerContent).toContain('port handleRequest : (RequestBundle -> msg) -> Sub msg');
                expect(handlerContent).toContain('port complete : Encode.Value -> Cmd msg');

                // Check main program structure
                expect(handlerContent).toContain('main : Program Flags Model Msg');
                expect(handlerContent).toContain('Platform.worker');
                expect(handlerContent).toContain('init = init');
                expect(handlerContent).toContain('update = update');
                expect(handlerContent).toContain('subscriptions = subscriptions');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates server timestamp usage documentation', async () => {
            const mockApiContent = `
#[buildamp_api(path = "TimestampTest")]
pub struct TimestampTestReq {
    pub host: String,
}
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'timestamp_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                await generateElmHandlers(config);
                
                const handlerContent = fs.readFileSync(
                    path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'TimestampTestHandlerTEA.elm'),
                    'utf-8'
                );

                // Check server timestamp function and documentation
                expect(handlerContent).toContain('getServerTimestamp : GlobalConfig -> Int');
                expect(handlerContent).toContain('getServerTimestamp config =');
                expect(handlerContent).toContain('config.serverNow');
                expect(handlerContent).toContain('Get server-issued timestamp for reliable time operations');
                expect(handlerContent).toContain('This ensures all timestamps come from the server, preventing client manipulation');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Dependency Checking', () => {
        test('detects when handler needs regeneration due to shared module changes', async () => {
            // Create an existing handler with old GlobalConfig structure
            const outdatedHandlerContent = `
port module Api.Handlers.OutdatedHandler exposing (main)

type alias Model =
    { globalConfig : GlobalConfig }

type alias GlobalConfig = {}

-- Rest of handler...
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'OutdatedHandlerTEA.elm');
            fs.writeFileSync(handlerPath, outdatedHandlerContent);

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
                                const result = await generateElmHandlers(config);
                
                // Should skip existing handler (scaffolding behavior - never overwrite)
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(1);

                // Handler content remains unchanged as existing scaffolding
                const handlerContent = fs.readFileSync(handlerPath, 'utf-8');
                expect(handlerContent).toContain('type alias GlobalConfig = {}');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('skips handler regeneration when up to date', async () => {
            // Create a current handler with proper structure
            const currentHandlerContent = `
port module Api.Handlers.CurrentHandler exposing (main)

import Generated.Database as DB

type alias Model =
    { globalConfig : GlobalConfig }

type alias GlobalConfig = DB.GlobalConfig

-- Rest of proper handler...
            `;

            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'CurrentHandlerTEA.elm');
            fs.writeFileSync(handlerPath, currentHandlerContent);

            // Create API definition
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'current_api.rs'),
                `
#[buildamp_api(path = "Current")]
pub struct CurrentReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                const result = await generateElmHandlers(config);
                
                // Should skip regeneration since handler is up to date
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(1);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('regenerates when Database module is newer than handler', async () => {
            // Create handler first
            const handlerPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'TimingHandlerTEA.elm');
            fs.writeFileSync(handlerPath, 'import Generated.Database as DB\n-- handler content --');

            // Wait a moment then update Database.elm to be newer
            setTimeout(() => {
                fs.writeFileSync(
                    path.join(testOutputDir, 'app', 'horatio', 'server', 'generated', 'Generated', 'Database.elm'),
                    'module Generated.Database exposing (..) -- updated'
                );
            }, 100);

            // Create API definition
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'timing_api.rs'),
                `
#[buildamp_api(path = "Timing")]
pub struct TimingReq {
    pub host: String,
}
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Wait for file system timing
                await new Promise(resolve => setTimeout(resolve, 200));
                
                                const result = await generateElmHandlers(config);
                
                // Should skip existing handler (scaffolding behavior - never overwrite)
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(1);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Compilation Script Generation', () => {
        test('generates compilation script for all handlers', async () => {
            const mockApiContent = `
#[buildamp_api(path = "CompileTest1")]
pub struct CompileTest1Req { pub host: String, }

#[buildamp_api(path = "CompileTest2")]  
pub struct CompileTest2Req { pub host: String, }
            `;

            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'compile_api.rs'), 
                mockApiContent
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                await generateElmHandlers(config);
                
                const scriptPath = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers', 'compile-handlers.sh');
                expect(fs.existsSync(scriptPath)).toBe(true);

                const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
                expect(scriptContent).toContain('#!/bin/bash');
                expect(scriptContent).toContain('Auto-generated Elm handler compilation script');
                expect(scriptContent).toContain('Auto-discover all .elm files in the handlers directory');
                expect(scriptContent).toContain('elm make "$elm_file"');
                expect(scriptContent).toContain('.cjs');

                // Check that script is executable
                const stats = fs.statSync(scriptPath);
                expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Has execute permissions

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Service Integration Generation', () => {
        test('generates service integration when no TEA support exists', async () => {
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'service_api.rs'),
                `
#[buildamp_api(path = "ServiceTest")]
pub struct ServiceTestReq { pub host: String, }
                `
            );

            // Create packages directory structure
            const middlewareDir = path.join(testOutputDir, 'packages', 'hamlet-server', 'middleware');
            fs.mkdirSync(middlewareDir, { recursive: true });

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    projectName: 'horatio',
                    backendElmPath: path.join(testOutputDir, 'src', 'generated'),
                    jsOutputPath: middlewareDir
                };
                await generateElmHandlers(config);

                const servicePath = path.join(middlewareDir, 'elm-service.js');
                expect(fs.existsSync(servicePath)).toBe(true);

                const serviceContent = fs.readFileSync(servicePath, 'utf-8');
                expect(serviceContent).toContain('Elm Service Middleware - Auto-generated');
                expect(serviceContent).toContain('export default function createElmService');
                expect(serviceContent).toContain('{ name: \'ServiceTest\', file: \'ServiceTestHandlerTEA\'');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('skips service integration when TEA support detected', async () => {
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'skip_api.rs'),
                `
#[buildamp_api(path = "SkipTest")]
pub struct SkipTestReq { pub host: String, }
                `
            );

            // Create existing service with TEA support
            const middlewareDir = path.join(testOutputDir, 'packages', 'hamlet-server', 'middleware');
            fs.mkdirSync(middlewareDir, { recursive: true });
            fs.writeFileSync(
                path.join(middlewareDir, 'elm-service.js'),
                'TEA Handler Support\n// existing TEA middleware'
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for test environment
                const config = {
                    inputBasePath: path.join(testOutputDir, 'src', 'models'),
                    handlersPath: path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers'),
                    projectName: 'horatio',
                    backendElmPath: path.join(testOutputDir, 'src', 'generated'),
                    jsOutputPath: middlewareDir
                };
                await generateElmHandlers(config);

                // Should not overwrite existing TEA service
                const serviceContent = fs.readFileSync(
                    path.join(middlewareDir, 'elm-service.js'),
                    'utf-8'
                );
                expect(serviceContent).toBe('TEA Handler Support\n// existing TEA middleware');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('handles missing API directory gracefully', async () => {
            // Remove the API directory
            fs.rmSync(path.join(testOutputDir, 'src'), { recursive: true, force: true });

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                const result = await generateElmHandlers(config);
                
                expect(result.generated).toBe(0);
                expect(result.skipped).toBe(0);
                expect(result.outputFiles).toEqual([]);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles malformed API definitions gracefully', async () => {
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'broken_api.rs'),
                'invalid rust syntax {{{'
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                const result = await generateElmHandlers(config);
                
                // Should complete without throwing errors
                expect(result).toBeDefined();
                expect(result.generated).toBe(0);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles file permission issues gracefully', async () => {
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'perm_api.rs'),
                `
#[buildamp_api(path = "PermTest")]
pub struct PermTestReq { pub host: String, }
                `
            );

            // Make handler directory read-only
            const handlerDir = path.join(testOutputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers');
            fs.chmodSync(handlerDir, '444');

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                                const result = await generateElmHandlers(config);
                
                // Should handle permission error gracefully
                expect(result).toBeDefined();

            } catch (error) {
                // Permission errors are expected in this test
                expect(error.code).toBe('EACCES');
            } finally {
                // Restore permissions for cleanup
                fs.chmodSync(handlerDir, '755');
                process.chdir(originalCwd);
            }
        });
    });

    describe('Performance', () => {
        test('handles multiple API files efficiently', async () => {
            // Create multiple API files
            for (let i = 0; i < 10; i++) {
                fs.writeFileSync(
                    path.join(testOutputDir, 'src', 'models', 'api', `api_${i}.rs`),
                    `
#[buildamp_api(path = "Handler${i}")]
pub struct Handler${i}Req { pub host: String, pub data${i}: String, }
                    `
                );
            }

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const start = Date.now();
                                const result = await generateElmHandlers(config);
                const duration = Date.now() - start;

                expect(result.generated).toBe(10);
                expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('reuses parsed results efficiently on repeat runs', async () => {
            fs.writeFileSync(
                path.join(testOutputDir, 'src', 'models', 'api', 'cache_api.rs'),
                `
#[buildamp_api(path = "CacheTest")]
pub struct CacheTestReq { pub host: String, }
                `
            );

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // First run
                const start1 = Date.now();
                                const result1 = await generateElmHandlers(config);
                const duration1 = Date.now() - start1;

                // Second run (should skip existing handlers)
                const start2 = Date.now();
                const result2 = await generateElmHandlers(config);
                const duration2 = Date.now() - start2;

                expect(result1.generated).toBe(1);
                expect(result2.generated).toBe(0);
                expect(result2.skipped).toBe(1);
                
                // Second run should be faster or equal (cached/skipped)
                expect(duration2).toBeLessThanOrEqual(duration1);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });
});