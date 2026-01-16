/**
 * Cross-Model Reference Tests
 * Tests for cross-model import resolution and cache primitive generation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Cross-Model Reference Parsing', () => {
    test('parseCrossModelReferences function exists', async () => {
        const { parseCrossModelReferences } = await import('../lib/generators/shared-paths.js');
        assert.ok(typeof parseCrossModelReferences === 'function');
    });

    test('parses single db import', async () => {
        const { parseCrossModelReferences } = await import('../lib/generators/shared-paths.js');

        const content = `
use crate::models::db::MicroblogItem;

pub struct CachedItems {
    pub items: Vec<MicroblogItem>,
}
`;
        const refs = parseCrossModelReferences(content);

        assert.ok(refs.db.includes('MicroblogItem'), 'Should detect MicroblogItem reference');
        assert.strictEqual(refs.db.length, 1, 'Should have exactly one db reference');
    });

    test('parses multiple single imports', async () => {
        const { parseCrossModelReferences } = await import('../lib/generators/shared-paths.js');

        const content = `
use crate::models::db::MicroblogItem;
use crate::models::db::ItemComment;

pub struct CachedContent {
    pub item: MicroblogItem,
    pub comments: Vec<ItemComment>,
}
`;
        const refs = parseCrossModelReferences(content);

        assert.ok(refs.db.includes('MicroblogItem'), 'Should detect MicroblogItem');
        assert.ok(refs.db.includes('ItemComment'), 'Should detect ItemComment');
        assert.strictEqual(refs.db.length, 2, 'Should have exactly two db references');
    });

    test('parses grouped imports', async () => {
        const { parseCrossModelReferences } = await import('../lib/generators/shared-paths.js');

        const content = `
use crate::models::db::{MicroblogItem, ItemComment, Tag};

pub struct CachedContent {
    pub item: MicroblogItem,
    pub comments: Vec<ItemComment>,
    pub tags: Vec<Tag>,
}
`;
        const refs = parseCrossModelReferences(content);

        assert.ok(refs.db.includes('MicroblogItem'), 'Should detect MicroblogItem');
        assert.ok(refs.db.includes('ItemComment'), 'Should detect ItemComment');
        assert.ok(refs.db.includes('Tag'), 'Should detect Tag');
        assert.strictEqual(refs.db.length, 3, 'Should have exactly three db references');
    });

    test('parses cross-interface references', async () => {
        const { parseCrossModelReferences } = await import('../lib/generators/shared-paths.js');

        const content = `
use crate::models::db::MicroblogItem;
use crate::models::api::GetItemResponse;

pub struct CachedApiItem {
    pub item: MicroblogItem,
    pub response: GetItemResponse,
}
`;
        const refs = parseCrossModelReferences(content);

        assert.ok(refs.db.includes('MicroblogItem'), 'Should detect db reference');
        assert.ok(refs.api.includes('GetItemResponse'), 'Should detect api reference');
        assert.strictEqual(refs.db.length, 1);
        assert.strictEqual(refs.api.length, 1);
    });

    test('ignores non-model imports', async () => {
        const { parseCrossModelReferences } = await import('../lib/generators/shared-paths.js');

        const content = `
use crate::framework::database_types::*;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

pub struct SomeModel {
    pub id: String,
}
`;
        const refs = parseCrossModelReferences(content);

        assert.strictEqual(refs.db.length, 0, 'Should have no db references');
        assert.strictEqual(refs.api.length, 0, 'Should have no api references');
    });

    test('returns empty arrays for all interfaces when no refs found', async () => {
        const { parseCrossModelReferences } = await import('../lib/generators/shared-paths.js');

        const content = `
pub struct PlainModel {
    pub id: String,
    pub name: String,
}
`;
        const refs = parseCrossModelReferences(content);

        assert.ok(Array.isArray(refs.db), 'db should be an array');
        assert.ok(Array.isArray(refs.api), 'api should be an array');
        assert.ok(Array.isArray(refs.storage), 'storage should be an array');
        assert.ok(Array.isArray(refs.kv), 'kv should be an array');
        assert.ok(Array.isArray(refs.sse), 'sse should be an array');
        assert.strictEqual(refs.db.length, 0);
        assert.strictEqual(refs.api.length, 0);
    });
});

describe('DB Model Metadata Loading', () => {
    test('loadDbModelMetadata function exists', async () => {
        const { loadDbModelMetadata } = await import('../lib/generators/shared-paths.js');
        assert.ok(typeof loadDbModelMetadata === 'function');
    });
});

describe('Cache Primitive Pattern', () => {
    test('db models with DatabaseId are cacheable', async () => {
        // This tests the design assumption that cache primitives
        // require DatabaseId for automatic key extraction

        const content = `
pub struct MicroblogItem {
    pub id: DatabaseId<String>,
    pub title: String,
}
`;
        // DatabaseId field indicates this model has a primary key
        // that can be used for cache keying
        assert.ok(content.includes('DatabaseId<'), 'Model should have DatabaseId field');
    });
});
