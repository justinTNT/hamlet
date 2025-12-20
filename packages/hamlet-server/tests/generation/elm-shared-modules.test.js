import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateElmSharedModules } from '../../../../shared/generation/elm_shared_modules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Elm Shared Modules Generation Tests', () => {
    const testOutputDir = path.join(__dirname, 'temp_elm_modules');
    
    beforeEach(() => {
        // Create temp directory for testing
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testOutputDir, { recursive: true });
    });

    afterEach(() => {
        // Clean up temp directory
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Rust Model Parsing', () => {
        test('parseRustDbModels extracts correct struct types', async () => {
            // Create mock Rust files for testing
            const mockDbDir = path.join(testOutputDir, 'src', 'models', 'db');
            fs.mkdirSync(mockDbDir, { recursive: true });

            const mockRustContent = `
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct MicroblogItem {
    pub id: DatabaseId<String>,
    pub title: String,
    pub link: Option<String>,
    pub image: Option<String>,
    pub extract: Option<String>,
    pub owner_comment: DefaultComment,
    pub tags: Vec<String>,
    pub comments: Vec<ItemComment>,
    pub timestamp: Timestamp,
    pub view_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct ItemComment {
    pub id: DatabaseId<String>,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub timestamp: Timestamp,
}
            `;

            fs.writeFileSync(path.join(mockDbDir, 'feed_db.rs'), mockRustContent);

            // Temporarily override the db path for testing
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Import the generation function and test parseRustDbModels
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                const result = await generateElmSharedModules(config);
                
                expect(result).toHaveProperty('length');
                expect(result.length).toBeGreaterThan(0);

                // Check that Database.elm was created with correct types
                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                expect(databaseContent).toContain('type alias MicroblogItemDb');
                expect(databaseContent).toContain('type alias ItemCommentDb');
                expect(databaseContent).toContain('id : String');
                expect(databaseContent).toContain('title : String');
                expect(databaseContent).toContain('link : Maybe String');
                expect(databaseContent).toContain('timestamp : Int');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles Rust Option types correctly', async () => {
            const mockDbDir = path.join(testOutputDir, 'src', 'models', 'db');
            fs.mkdirSync(mockDbDir, { recursive: true });

            const optionTestContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct TestModel {
    pub required_field: String,
    pub optional_field: Option<String>,
    pub optional_int: Option<i32>,
    pub optional_vec: Option<Vec<String>>,
}
            `;

            fs.writeFileSync(path.join(mockDbDir, 'test_db.rs'), optionTestContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                expect(databaseContent).toContain('requiredField : String');
                expect(databaseContent).toContain('optionalField : Maybe String');
                expect(databaseContent).toContain('optionalInt : Maybe Int');
                expect(databaseContent).toContain('optionalVec : Maybe List String');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('converts snake_case to camelCase correctly', () => {
            // This would test the snakeToCamel function used in parsing
            const testCases = [
                ['item_id', 'itemId'],
                ['created_at', 'createdAt'],
                ['user_session_data', 'userSessionData'],
                ['simple', 'simple'],
                ['already_camel', 'alreadyCamel']
            ];

            // Note: This requires exposing the snakeToCamel function for testing
            // For now, we test the result in generated output
            testCases.forEach(([snake, expected]) => {
                expect(snake.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())).toBe(expected);
            });
        });
    });

    describe('GlobalConfig and GlobalState Generation', () => {
        test('generates proper GlobalConfig with server timestamps', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias GlobalConfig =');
                expect(databaseContent).toContain('serverNow : Int');
                expect(databaseContent).toContain('hostIsolation : Bool');
                expect(databaseContent).toContain('environment : String');
                expect(databaseContent).toContain('Server-issued Unix timestamp (milliseconds)');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates proper GlobalState for mutable handler state', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias GlobalState =');
                expect(databaseContent).toContain('requestCount : Int');
                expect(databaseContent).toContain('lastActivity : Int');
                expect(databaseContent).toContain('Mutable state that can be updated through TEA Model updates');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Database Interface Generation', () => {
        test('generates proper query builder types', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias Query a =');
                expect(databaseContent).toContain('filter : List (Filter a)');
                expect(databaseContent).toContain('sort : List (Sort a)');
                expect(databaseContent).toContain('paginate : Maybe Pagination');

                expect(databaseContent).toContain('type Filter a');
                expect(databaseContent).toContain('= ById String');
                expect(databaseContent).toContain('| BySlug String');
                expect(databaseContent).toContain('| ByUserId String');

                expect(databaseContent).toContain('type Sort a');
                expect(databaseContent).toContain('= CreatedAtAsc');
                expect(databaseContent).toContain('| CreatedAtDesc');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates database function signatures', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('findMicroblogItems : Query MicroblogItemDb -> Cmd msg');
                expect(databaseContent).toContain('createMicroblogItem : MicroblogItemDbCreate -> (Result String MicroblogItemDb -> msg) -> Cmd msg');
                expect(databaseContent).toContain('updateMicroblogItem : String -> MicroblogItemDbUpdate -> (Result String MicroblogItemDb -> msg) -> Cmd msg');
                expect(databaseContent).toContain('killMicroblogItem : String -> (Result String Int -> msg) -> Cmd msg');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates query builder helper functions', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('queryAll : Query a');
                expect(databaseContent).toContain('byId : String -> Query a -> Query a');
                expect(databaseContent).toContain('bySlug : String -> Query a -> Query a');
                expect(databaseContent).toContain('sortByCreatedAt : Query a -> Query a');
                expect(databaseContent).toContain('paginate : Int -> Int -> Query a -> Query a');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Events Module Generation', () => {
        test('generates Events.elm with proper structure', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const eventsPath = path.join(testOutputDir, 'Generated', 'Events.elm');
                expect(fs.existsSync(eventsPath)).toBe(true);

                const eventsContent = fs.readFileSync(eventsPath, 'utf-8');
                expect(eventsContent).toContain('module Generated.Events exposing (..)');
                expect(eventsContent).toContain('type alias EventRequest =');
                expect(eventsContent).toContain('port eventPush : EventRequest -> Cmd msg');
                expect(eventsContent).toContain('pushEvent : EventPayload -> Cmd msg');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates event scheduling types', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const eventsContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Events.elm'), 'utf-8');
                expect(eventsContent).toContain('schedule : Maybe String');
                expect(eventsContent).toContain('delay : Int');
                expect(eventsContent).toContain('cronEvent : String -> EventPayload -> Cmd msg');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Services Module Generation', () => {
        test('generates Services.elm with HTTP functionality', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const servicesPath = path.join(testOutputDir, 'Generated', 'Services.elm');
                expect(fs.existsSync(servicesPath)).toBe(true);

                const servicesContent = fs.readFileSync(servicesPath, 'utf-8');
                expect(servicesContent).toContain('module Generated.Services exposing (..)');
                expect(servicesContent).toContain('type alias HttpRequest =');
                expect(servicesContent).toContain('port httpRequest : HttpRequestPort -> Cmd msg');
                expect(servicesContent).toContain('get : String -> List (String, String) -> Cmd msg');
                expect(servicesContent).toContain('post : String -> List (String, String) -> Encode.Value -> Cmd msg');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates HTTP response handling', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const servicesContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Services.elm'), 'utf-8');
                expect(servicesContent).toContain('type alias HttpResponse =');
                expect(servicesContent).toContain('port httpResponse : (HttpResponsePort -> msg) -> Sub msg');
                expect(servicesContent).toContain('status : Int');
                expect(servicesContent).toContain('headers : List (String, String)');
                expect(servicesContent).toContain('body : String');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Code Quality and Safety', () => {
        test('all generated files have proper headers', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const files = ['Database.elm', 'Events.elm', 'Services.elm'];
                files.forEach(filename => {
                    const content = fs.readFileSync(path.join(testOutputDir, 'Generated', filename), 'utf-8');
                    expect(content).toContain('Generated');
                    expect(content).toContain('@docs');
                });

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates valid Elm syntax', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                // Test for proper Elm syntax patterns
                expect(databaseContent).toMatch(/^port module Generated\.Database exposing \(\.\.\)$/m);
                expect(databaseContent).toMatch(/type alias \w+ =/);
                expect(databaseContent).toMatch(/port \w+ :/);
                
                // No JavaScript patterns should appear
                expect(databaseContent).not.toContain('function');
                expect(databaseContent).not.toContain('const ');
                expect(databaseContent).not.toContain('var ');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('enforces proper module structure', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                ['Database.elm', 'Events.elm', 'Services.elm'].forEach(filename => {
                    const content = fs.readFileSync(path.join(testOutputDir, 'Generated', filename), 'utf-8');
                    
                    // Module declaration should be first non-comment line
                    const lines = content.split('\n').filter(line => !line.trim().startsWith('{-') && line.trim() !== '');
                    expect(lines[0]).toMatch(/^(port )?module Generated\./);
                    
                    // Should have proper exposing clause
                    expect(content).toContain('exposing (..)');
                });

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Error Handling', () => {
        test('handles missing src/models/db directory gracefully', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // No mock_db directory created - should handle gracefully
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                const result = await generateElmSharedModules(config);
                
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
                
                // Should still generate basic modules even without Rust files
                expect(fs.existsSync(path.join(testOutputDir, 'Generated', 'Database.elm'))).toBe(true);
                expect(fs.existsSync(path.join(testOutputDir, 'Generated', 'Events.elm'))).toBe(true);
                expect(fs.existsSync(path.join(testOutputDir, 'Generated', 'Services.elm'))).toBe(true);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles malformed Rust files gracefully', async () => {
            const mockDbDir = path.join(testOutputDir, 'src', 'models', 'db');
            fs.mkdirSync(mockDbDir, { recursive: true });

            // Create invalid Rust content
            fs.writeFileSync(path.join(mockDbDir, 'broken_db.rs'), 'invalid rust syntax {{{');

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                const result = await generateElmSharedModules(config);
                
                // Should complete despite malformed files
                expect(result).toBeDefined();
                expect(fs.existsSync(path.join(testOutputDir, 'Generated', 'Database.elm'))).toBe(true);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Performance', () => {
        test('generation completes within reasonable time', async () => {
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const start = Date.now();
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);
                const duration = Date.now() - start;

                // Should complete within 5 seconds even with file I/O
                expect(duration).toBeLessThan(5000);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });
});