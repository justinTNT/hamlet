/**
 * KV Store Generator Unit Tests
 * Tests for Redis/KV store function generation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { _test } from '../lib/generators/kv.js';

const { generateKvFunctions } = _test;

// Sample KV model for testing
const sampleModel = {
    name: 'CachedFeed',
    fields: [
        { name: 'items', type: 'List FeedItem' },
        { name: 'ttl', type: 'Int' },
        { name: 'lastUpdated', type: 'Int' }
    ]
};

describe('KV Generator - Function Generation', () => {
    test('generateKvFunctions creates set function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('async function setCachedFeed'));
        assert.ok(result.includes('(cachedfeed, key, host, kvClient)'));
    });

    test('generateKvFunctions creates get function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('async function getCachedFeed'));
        assert.ok(result.includes('(key, host, kvClient)'));
    });

    test('generateKvFunctions creates delete function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('async function deleteCachedFeed'));
        assert.ok(result.includes('(key, host, kvClient)'));
    });

    test('generateKvFunctions creates exists function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('async function existsCachedFeed'));
        assert.ok(result.includes('(key, host, kvClient)'));
    });

    test('generateKvFunctions creates updateTtl function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('async function updateTtlCachedFeed'));
        assert.ok(result.includes('(key, ttl, host, kvClient)'));
    });
});

describe('KV Generator - Tenant Isolation', () => {
    test('set function uses tenant-prefixed key', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('const tenantKey = `${host}:cachedfeed:${key}`'));
    });

    test('get function uses tenant-prefixed key', () => {
        const result = generateKvFunctions(sampleModel);

        // Check get function has tenant key
        assert.ok(result.includes('const tenantKey = `${host}:cachedfeed:${key}`'));
    });

    test('delete function uses tenant-prefixed key', () => {
        const result = generateKvFunctions(sampleModel);

        // All functions should use tenant key pattern
        const tenantKeyPattern = 'const tenantKey = `${host}:cachedfeed:${key}`';
        const matches = result.match(new RegExp(tenantKeyPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
        // Should appear in all 5 functions
        assert.strictEqual(matches.length, 5);
    });
});

describe('KV Generator - Redis Operations', () => {
    test('set function uses setex with TTL', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('kvClient.setex(tenantKey, ttl, serialized)'));
    });

    test('set function has default TTL', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('const ttl = cachedfeed.ttl || 3600'));
    });

    test('get function uses kvClient.get', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('await kvClient.get(tenantKey)'));
    });

    test('delete function uses kvClient.del', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('await kvClient.del(tenantKey)'));
    });

    test('exists function uses kvClient.exists', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('await kvClient.exists(tenantKey)'));
    });

    test('updateTtl function uses kvClient.expire', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('await kvClient.expire(tenantKey, ttl)'));
    });
});

describe('KV Generator - JSON Serialization', () => {
    test('set function serializes data', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('JSON.stringify(cachedfeed)'));
    });

    test('get function parses data', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('JSON.parse(data)'));
    });

    test('get function handles null data', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('if (!data)'));
        assert.ok(result.includes('return null'));
    });
});

describe('KV Generator - Error Handling', () => {
    test('set function has try-catch', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('try {'));
        assert.ok(result.includes('} catch (error)'));
    });

    test('set function logs errors', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('console.error(`Error setting CachedFeed:`'));
    });

    test('get function logs errors', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('console.error(`Error getting CachedFeed:`'));
    });

    test('delete function returns boolean', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('return result === 1'));
        assert.ok(result.includes('return false'));
    });
});

describe('KV Generator - Return Values', () => {
    test('set function returns boolean', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('return true'));
        assert.ok(result.includes('return false'));
    });

    test('get function returns object or null', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('return JSON.parse(data)'));
        assert.ok(result.includes('return null'));
    });

    test('exists function returns boolean', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('return result === 1'));
    });
});

describe('KV Generator - Different Model Names', () => {
    test('handles single word model name', () => {
        const model = { name: 'Session', fields: [] };
        const result = generateKvFunctions(model);

        assert.ok(result.includes('async function setSession'));
        assert.ok(result.includes('async function getSession'));
        assert.ok(result.includes('${host}:session:${key}'));
    });

    test('handles multi-word model name', () => {
        const model = { name: 'UserPreferences', fields: [] };
        const result = generateKvFunctions(model);

        assert.ok(result.includes('async function setUserPreferences'));
        assert.ok(result.includes('async function getUserPreferences'));
        assert.ok(result.includes('${host}:userpreferences:${key}'));
    });

    test('handles acronym model name', () => {
        const model = { name: 'APICache', fields: [] };
        const result = generateKvFunctions(model);

        assert.ok(result.includes('async function setAPICache'));
        assert.ok(result.includes('async function getAPICache'));
        assert.ok(result.includes('${host}:apicache:${key}'));
    });
});

describe('KV Generator - Documentation', () => {
    test('includes JSDoc for set function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('* Set CachedFeed in KV store with TTL and tenant isolation'));
        assert.ok(result.includes('@param {Object}'));
        assert.ok(result.includes('@param {string} key'));
        assert.ok(result.includes('@param {string} host'));
        assert.ok(result.includes('@param {Object} kvClient'));
    });

    test('includes JSDoc for get function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('* Get CachedFeed from KV store with tenant isolation'));
        assert.ok(result.includes('@returns {Object|null}'));
    });

    test('includes JSDoc for delete function', () => {
        const result = generateKvFunctions(sampleModel);

        assert.ok(result.includes('* Delete CachedFeed from KV store with tenant isolation'));
        assert.ok(result.includes('@returns {boolean}'));
    });
});
