import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const createBuildampPath = path.join(__dirname, '..', 'index.js');

test('From-models mode', async (t) => {
    const testModelsDir = path.join(__dirname, 'fixtures', 'test-models');
    const testAppDir = path.join(__dirname, 'temp-test-app');
    
    // Setup test fixtures
    const setupFixtures = () => {
        // Create test models directory structure
        fs.mkdirSync(testModelsDir, { recursive: true });
        fs.mkdirSync(path.join(testModelsDir, 'api'), { recursive: true });
        fs.mkdirSync(path.join(testModelsDir, 'events'), { recursive: true });
        fs.mkdirSync(path.join(testModelsDir, 'db'), { recursive: true });
        
        // Create test model files
        fs.writeFileSync(path.join(testModelsDir, 'api', 'test_api.rs'), `
pub struct TestApi {
    pub name: String,
    pub description: Option<String>,
}
`);
        
        fs.writeFileSync(path.join(testModelsDir, 'events', 'test_event.rs'), `
use crate::framework::event_types::{CorrelationId, ExecuteAt, DateTime};

pub struct TestEvent {
    pub correlation_id: CorrelationId,
    pub message: String,
    pub execute_at: Option<ExecuteAt<DateTime>>,
}
`);
        
        fs.writeFileSync(path.join(testModelsDir, 'db', 'test_model.rs'), `
pub struct TestModel {
    pub id: i32,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
`);
    };
    
    // Cleanup function
    const cleanup = () => {
        if (fs.existsSync(testModelsDir)) {
            fs.rmSync(testModelsDir, { recursive: true, force: true });
        }
        if (fs.existsSync(testAppDir)) {
            fs.rmSync(testAppDir, { recursive: true, force: true });
        }
    };
    
    await t.test('--from-models --dry-run shows discovered models', async () => {
        setupFixtures();
        
        const result = execSync(`node ${createBuildampPath} --dry-run --from-models ${testModelsDir} test-app`, {
            encoding: 'utf8'
        });
        
        assert.ok(result.includes('DRY RUN:'), 'Should show dry run message');
        assert.ok(result.includes('test-app'), 'Should show project name');
        assert.ok(result.includes('Discovered models:'), 'Should list discovered models');
        assert.ok(result.includes('api/test_api'), 'Should find API model');
        assert.ok(result.includes('events/test_event'), 'Should find event model');
        assert.ok(result.includes('db/test_model'), 'Should find DB model');
        
        cleanup();
    });
    
    await t.test('--from-models creates app with copied models', async () => {
        setupFixtures();
        
        execSync(`node ${createBuildampPath} --from-models ${testModelsDir} temp-test-app`, {
            cwd: __dirname
        });
        
        // Verify app structure was created
        assert.ok(fs.existsSync(testAppDir), 'Should create app directory');
        assert.ok(fs.existsSync(path.join(testAppDir, 'Cargo.toml')), 'Should create Cargo.toml');
        assert.ok(fs.existsSync(path.join(testAppDir, 'src')), 'Should create src directory');
        assert.ok(fs.existsSync(path.join(testAppDir, 'web')), 'Should create web directory');
        assert.ok(fs.existsSync(path.join(testAppDir, 'server')), 'Should create server directory');
        
        // Verify models were copied
        const modelsDirInApp = path.join(testAppDir, 'src', 'models');
        assert.ok(fs.existsSync(modelsDirInApp), 'Should create models directory in app');
        assert.ok(fs.existsSync(path.join(modelsDirInApp, 'api', 'test_api.rs')), 'Should copy API model');
        assert.ok(fs.existsSync(path.join(modelsDirInApp, 'events', 'test_event.rs')), 'Should copy event model');
        assert.ok(fs.existsSync(path.join(modelsDirInApp, 'db', 'test_model.rs')), 'Should copy DB model');
        
        // Verify model content is preserved
        const copiedEventModel = fs.readFileSync(path.join(modelsDirInApp, 'events', 'test_event.rs'), 'utf8');
        assert.ok(copiedEventModel.includes('CorrelationId'), 'Should preserve framework types');
        assert.ok(copiedEventModel.includes('ExecuteAt<DateTime>'), 'Should preserve event framework types');
        
        cleanup();
    });
    
    await t.test('--from-models with non-existent directory shows error', async () => {
        try {
            execSync(`node ${createBuildampPath} --from-models /non/existent/path test-app`, {
                encoding: 'utf8',
                stderr: 'pipe'
            });
            assert.fail('Should throw error for non-existent directory');
        } catch (error) {
            assert.ok(error.stderr.includes('Models directory not found'), 'Should show helpful error message');
        }
    });
});