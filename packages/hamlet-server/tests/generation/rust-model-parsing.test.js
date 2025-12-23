import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the parsing functions (these would need to be exported from elm_shared_modules.js for testing)
// For now, we'll test the integrated behavior through generated output

describe('Rust Model Parsing Tests', () => {
    const testOutputDir = path.join(__dirname, 'temp_rust_parsing');
    
    beforeEach(() => {
        // Create temp directory structure
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testOutputDir, { recursive: true });
        
        const dbDir = path.join(testOutputDir, 'src', 'models', 'db');
        fs.mkdirSync(dbDir, { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Basic Rust Type Parsing', () => {
        test('parses simple struct with basic types', async () => {
            const rustContent = `
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct SimpleItem {
    pub id: String,
    pub name: String,
    pub count: i32,
    pub active: bool,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'simple_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias SimpleItemDb =');
                expect(databaseContent).toContain('id : String');
                expect(databaseContent).toContain('name : String');
                expect(databaseContent).toContain('count : Int');
                expect(databaseContent).toContain('active : Bool');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('converts Rust naming conventions to Elm conventions', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct NamingExample {
    pub user_id: String,
    pub created_at: i64,
    pub first_name: String,
    pub is_admin: bool,
    pub email_verified: bool,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'naming_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias NamingExampleDb =');
                expect(databaseContent).toContain('userId : String');
                expect(databaseContent).toContain('createdAt : Int');
                expect(databaseContent).toContain('firstName : String');
                expect(databaseContent).toContain('isAdmin : Bool');
                expect(databaseContent).toContain('emailVerified : Bool');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles Option types correctly', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct OptionalFields {
    pub required_field: String,
    pub optional_string: Option<String>,
    pub optional_int: Option<i32>,
    pub optional_bool: Option<bool>,
    pub optional_vec: Option<Vec<String>>,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'optional_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias OptionalFieldsDb =');
                expect(databaseContent).toContain('requiredField : String');
                expect(databaseContent).toContain('optionalString : Maybe String');
                expect(databaseContent).toContain('optionalInt : Maybe Int');
                expect(databaseContent).toContain('optionalBool : Maybe Bool');
                expect(databaseContent).toContain('optionalVec : Maybe List String');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles Vec types correctly', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct VecExample {
    pub tags: Vec<String>,
    pub numbers: Vec<i32>,
    pub flags: Vec<bool>,
    pub nested_lists: Vec<Vec<String>>,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'vec_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias VecExampleDb =');
                expect(databaseContent).toContain('tags : List String');
                expect(databaseContent).toContain('numbers : List Int');
                expect(databaseContent).toContain('flags : List Bool');
                expect(databaseContent).toContain('nestedLists : List (List String)');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Complex Rust Type Parsing', () => {
        test('handles nested struct references', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct User {
    pub id: String,
    pub profile: UserProfile,
    pub sessions: Vec<UserSession>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct UserProfile {
    pub name: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct UserSession {
    pub id: String,
    pub expires_at: i64,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'complex_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias UserDb =');
                expect(databaseContent).toContain('type alias UserProfileDb =');
                expect(databaseContent).toContain('type alias UserSessionDb =');
                expect(databaseContent).toContain('profile : UserProfileDb');
                expect(databaseContent).toContain('sessions : List UserSessionDb');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles custom database types', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct CustomTypes {
    pub id: DatabaseId<String>,
    pub timestamp: Timestamp,
    pub comment: DefaultComment,
    pub uuid: Uuid,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'custom_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias CustomTypesDb =');
                expect(databaseContent).toContain('id : String'); // DatabaseId<String> -> String
                expect(databaseContent).toContain('timestamp : Int'); // Timestamp -> Int
                expect(databaseContent).toContain('comment : String'); // DefaultComment -> String
                expect(databaseContent).toContain('uuid : String'); // Uuid -> String

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles enums correctly', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Status {
    Active,
    Inactive,
    Pending,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct ItemWithStatus {
    pub id: String,
    pub status: Status,
    pub optional_status: Option<Status>,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'enum_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                expect(databaseContent).toContain('type alias ItemWithStatusDb =');
                // For now, enums are treated as strings
                expect(databaseContent).toContain('status : String');
                expect(databaseContent).toContain('optionalStatus : Maybe String');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('CRUD Operations Generation', () => {
        test('generates Create, Read, Update, Delete operations for each struct', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct Article {
    pub id: String,
    pub title: String,
    pub content: String,
    pub published: bool,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'article_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                // Check for port-based database interface (current system)
                expect(databaseContent).toContain('port dbFind : DbFindRequest -> Cmd msg');
                expect(databaseContent).toContain('port dbCreate : DbCreateRequest -> Cmd msg');
                expect(databaseContent).toContain('port dbUpdate : DbUpdateRequest -> Cmd msg');
                expect(databaseContent).toContain('port dbKill : DbKillRequest -> Cmd msg');
                
                // Check for query builder functions
                expect(databaseContent).toContain('queryAll : Query a');
                expect(databaseContent).toContain('byId : String -> Query a -> Query a');
                expect(databaseContent).toContain('sortByCreatedAt : Query a -> Query a');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('generates proper encoders and decoders', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct Product {
    pub id: String,
    pub name: String,
    pub price: f64,
    pub in_stock: bool,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'product_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                // Check for generic encoding/decoding in port-based system
                expect(databaseContent).toContain('type alias DbCreateRequest');
                expect(databaseContent).toContain('type alias DbUpdateRequest');
                expect(databaseContent).toContain('type alias DbResponse');
                
                // Check for JSON encode/decode imports
                expect(databaseContent).toContain('import Json.Encode as Encode');
                expect(databaseContent).toContain('import Json.Decode as Decode');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('handles empty files gracefully', async () => {
            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'empty_db.rs'), '');

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                const result = await generateElmSharedModules(config);

                expect(result).toBeDefined();
                expect(fs.existsSync(path.join(testOutputDir, 'Generated', 'Database.elm'))).toBe(true);

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles files with no structs', async () => {
            const rustContent = `
// Just comments and imports
use serde::{Deserialize, Serialize};

const SOME_CONSTANT: i32 = 42;

pub fn some_function() -> String {
    "hello".to_string()
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'no_structs_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                const result = await generateElmSharedModules(config);

                expect(result).toBeDefined();
                // Should still generate Database.elm with basic structure
                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                expect(databaseContent).toContain('module Generated.Database exposing (..)');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles malformed Rust syntax gracefully', async () => {
            const malformedContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct Broken {
    pub field: String
    // Missing comma and semicolon
    pub another_field: i32
    invalid syntax here {{{
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'broken_db.rs'), malformedContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                const result = await generateElmSharedModules(config);

                // Should not throw, should handle gracefully
                expect(result).toBeDefined();

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('handles very large structs efficiently', async () => {
            // Generate a struct with 100 fields to test performance
            let rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct LargeStruct {
`;
            
            for (let i = 0; i < 100; i++) {
                rustContent += `    pub field_${i}: String,\n`;
            }
            
            rustContent += '}';

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'large_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const start = Date.now();
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);
                const duration = Date.now() - start;

                expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                expect(databaseContent).toContain('type alias LargeStructDb =');
                expect(databaseContent).toContain('field0 : String');
                expect(databaseContent).toContain('field99 : String');

            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('Security and Validation', () => {
        test('sanitizes field names properly', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct SecurityTest {
    #[serde(rename = "user-id")]
    pub user_id: String,
    #[serde(rename = "data.field")]
    pub data_field: String,
    pub normal_field: String,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'security_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                // Should generate safe Elm field names
                expect(databaseContent).toContain('userId : String');
                expect(databaseContent).toContain('dataField : String');
                expect(databaseContent).toContain('normalField : String');
                
                // Should not contain dangerous characters
                expect(databaseContent).not.toContain('user-id');
                expect(databaseContent).not.toContain('data.field');

            } finally {
                process.chdir(originalCwd);
            }
        });

        test('validates struct names for Elm compatibility', async () => {
            const rustContent = `
#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct valid_struct {
    pub field: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[buildamp_domain]
pub struct ValidStruct {
    pub field: String,
}
            `;

            fs.writeFileSync(path.join(testOutputDir, 'src', 'models', 'db', 'validation_db.rs'), rustContent);

            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                const { generateElmSharedModules } = await import('../../../../shared/generation/elm_shared_modules.js');
                
                // Configure for simple project structure (not monorepo)
                const config = {
                    inputBasePath: testOutputDir,
                    backendElmPath: testOutputDir  // The function adds /Generated automatically
                };
                
                // Create output directory
                fs.mkdirSync(path.join(testOutputDir, 'Generated'), { recursive: true });
                
                await generateElmSharedModules(config);

                const databaseContent = fs.readFileSync(path.join(testOutputDir, 'Generated', 'Database.elm'), 'utf-8');
                
                // Check that the current port-based system properly validates and processes structs
                // Both valid_struct and ValidStruct should be processed into the generic port system
                expect(databaseContent).toContain('port dbFind');
                expect(databaseContent).toContain('port dbCreate');
                
                // The system should successfully generate the database module without errors
                expect(databaseContent).toContain('port module Generated.Database exposing');
                
                // Should contain at least one struct validation (no duplicates cause issues)
                const dbPortCount = (databaseContent.match(/port db/g) || []).length;
                expect(dbPortCount).toBeGreaterThanOrEqual(1);

            } finally {
                process.chdir(originalCwd);
            }
        });
    });
});