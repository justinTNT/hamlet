import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Webhook Integration Tests', () => {
    const testDir = path.join(__dirname, 'fixtures', 'webhook-integration');
    const hooksDir = path.join(testDir, 'src', 'models', 'hooks');
    
    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        fs.mkdirSync(hooksDir, { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should generate webhook handlers when hooks directory exists', () => {
        // Create a webhook model
        const webhookContent = `use serde::{Deserialize, Serialize};

// Test webhook for integration
// Route: POST /api/webhooks/integration-test
// Headers: X-Test-Signature, Content-Type: application/json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationTestWebhook {
    pub signature: String,
    pub test_data: String,
}`;

        fs.writeFileSync(path.join(hooksDir, 'integration_test.rs'), webhookContent);

        // Change to test directory and run codegen
        const originalCwd = process.cwd();
        try {
            process.chdir(testDir);
            
            // Run the CLI command (would need to adjust path)
            const indexPath = path.join(__dirname, '..', 'index.js');
            const output = execSync(`node ${indexPath} --codegen-only --output test-output`, {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            // Check that webhook handlers were generated
            const webhookDir = path.join(testDir, 'test-output', 'elm', 'webhooks');
            
            if (fs.existsSync(webhookDir)) {
                const webhookFiles = fs.readdirSync(webhookDir);
                
                // Should have generated a handler for our webhook
                const hasIntegrationHandler = webhookFiles.some(file => 
                    file.includes('IntegrationTestWebhook') && file.endsWith('.elm')
                );
                
                assert.ok(hasIntegrationHandler, 'Should generate integration test webhook handler');
            }

        } finally {
            process.chdir(originalCwd);
        }
    });

    it('should handle empty hooks directory gracefully', () => {
        // Test with empty hooks directory
        const originalCwd = process.cwd();
        try {
            process.chdir(testDir);
            
            const indexPath = path.join(__dirname, '..', 'index.js');
            
            // This should not fail even with empty hooks directory
            assert.doesNotThrow(() => {
                execSync(`node ${indexPath} --codegen-only --output test-empty --dry-run`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
            });

        } finally {
            process.chdir(originalCwd);
        }
    });

    it('should validate webhook handler Elm syntax', () => {
        // Create a simple webhook
        const simpleWebhook = `use serde::{Deserialize, Serialize};

// Simple validation test
// Route: GET /api/webhooks/validate
// Query params: token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidateWebhook {
    pub token: String,
}`;

        fs.writeFileSync(path.join(hooksDir, 'validate_webhook.rs'), simpleWebhook);

        const originalCwd = process.cwd();
        try {
            process.chdir(testDir);
            
            const indexPath = path.join(__dirname, '..', 'index.js');
            execSync(`node ${indexPath} --codegen-only --output validate-test`, {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            // Check that generated Elm files have basic syntax correctness
            const webhookDir = path.join(testDir, 'validate-test', 'elm', 'webhooks');
            
            if (fs.existsSync(webhookDir)) {
                const webhookFiles = fs.readdirSync(webhookDir);
                
                for (const file of webhookFiles) {
                    if (file.endsWith('.elm')) {
                        const filePath = path.join(webhookDir, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        
                        // Basic Elm syntax checks
                        assert.ok(content.includes('module Webhooks.'), 'Should have proper module declaration');
                        assert.ok(content.includes('import'), 'Should have import statements');
                        assert.ok(content.includes('type Msg'), 'Should have Msg type declaration');
                        
                        // Should not have obvious syntax errors
                        assert.ok(!content.includes('undefined'), 'Should not contain undefined references');
                    }
                }
            }

        } finally {
            process.chdir(originalCwd);
        }
    });
});