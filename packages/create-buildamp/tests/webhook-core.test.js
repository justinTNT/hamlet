import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseWebhookModels } from '../index.js';

describe('Webhook Core Functionality', () => {
    it('should parse basic incoming webhook', () => {
        const rustContent = `use serde::{Deserialize, Serialize};

// Test webhook
// Route: POST /api/webhooks/test
// Headers: X-Signature, Content-Type: application/json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestWebhook {
    pub signature: String,
}`;

        const result = parseWebhookModels(rustContent, 'test.rs');
        
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'TestWebhook');
        assert.strictEqual(result[0].method, 'POST');
        assert.strictEqual(result[0].path, '/api/webhooks/test');
        assert.strictEqual(result[0].isOutgoing, false);
    });

    it('should parse outgoing webhook', () => {
        const rustContent = `use serde::{Deserialize, Serialize};

// Send to external service
// Route: POST to external URLs
// Headers: Authorization: Bearer {token}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutgoingWebhook {
    pub token: String,
}`;

        const result = parseWebhookModels(rustContent, 'outgoing.rs');
        
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'OutgoingWebhook');
        assert.strictEqual(result[0].isOutgoing, true);
    });

    it('should parse GET webhook with query params', () => {
        const rustContent = `use serde::{Deserialize, Serialize};

// Verification endpoint
// Route: GET /api/verify
// Query params: challenge, mode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyWebhook {
    pub challenge: String,
    pub mode: String,
}`;

        const result = parseWebhookModels(rustContent, 'verify.rs');
        
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].method, 'GET');
        assert.ok(result[0].queryParams['challenge']);
        assert.ok(result[0].queryParams['mode']);
    });

    it('should handle multiple webhooks in one file', () => {
        const rustContent = `use serde::{Deserialize, Serialize};

// First webhook
// Route: POST /api/first
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirstWebhook {
    pub data: String,
}

// Second webhook  
// Route: POST /api/second
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecondWebhook {
    pub info: String,
}`;

        const result = parseWebhookModels(rustContent, 'multi.rs');
        
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].name, 'FirstWebhook');
        assert.strictEqual(result[1].name, 'SecondWebhook');
    });

    it('should handle files with no webhooks', () => {
        const rustContent = `use serde::{Deserialize, Serialize};

// Regular struct, no webhook metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegularStruct {
    pub data: String,
}`;

        const result = parseWebhookModels(rustContent, 'regular.rs');
        
        assert.strictEqual(result.length, 0);
    });

    it('should parse headers correctly', () => {
        const rustContent = `use serde::{Deserialize, Serialize};

// Header test
// Route: POST /api/headers
// Headers: X-Custom-Header, Authorization, Content-Type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderWebhook {
    pub data: String,
}`;

        const result = parseWebhookModels(rustContent, 'headers.rs');
        
        assert.strictEqual(result.length, 1);
        assert.ok(result[0].headers['X-Custom-Header']);
        assert.ok(result[0].headers['Authorization']);
        assert.ok(result[0].headers['Content-Type']);
    });
});