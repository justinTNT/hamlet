# Rust → Elm Model Migration: Sprint Plan

## Overview

Migrate model definitions from Rust (`app/horatio/models/*.rs`) to Elm (`Schema/*.elm`) using transparent type aliases. Buildamp's JS parser will read Elm instead of Rust.

---

## Sprint 0: Golden Snapshot (Pre-Migration Baseline)

**Goal:** Capture current outputs as regression baseline.

### Tasks
1. Run full generation, snapshot all outputs:
   ```bash
   npx buildamp gen --src app/horatio/models --dest app/horatio
   ```
2. Create golden files directory: `tests/golden/`
3. Copy generated outputs:
   - `server/.hamlet-gen/schema.json`
   - `sql/migrations/schema.sql`
   - `server/.hamlet-gen/database-queries.js`
   - `server/.hamlet-gen/Generated/Database.elm`
   - `server/src/Api/Backend.elm` (elm-rs output)

### New Tests
```javascript
// tests/golden.test.js
test('SQL output matches golden snapshot', () => {
    const current = fs.readFileSync('sql/migrations/schema.sql');
    const golden = fs.readFileSync('tests/golden/schema.sql');
    assert.strictEqual(current, golden);
});
```

### Exit Criteria
- [ ] All current outputs captured in `tests/golden/`
- [ ] Snapshot comparison test passes

---

## Sprint 1: Elm Parser Foundation

**Goal:** Create Elm parser alongside Rust parser. Both produce identical intermediate representation.

### Tasks
1. Create `packages/buildamp/core/elm-parser.js`:
   ```javascript
   export function parseElmDbModels(schemaPath) { ... }
   export function parseElmType(content, filename) { ... }
   ```

2. Create `Framework/Schema.elm` with magic types:
   ```elm
   module Framework.Schema exposing (..)

   type alias DatabaseId a = a
   type alias Timestamp = Int
   type alias Link a = Maybe a
   type alias RichContent = String
   type alias ForeignKey table a = a
   type alias Host = String
   ```

3. Parser handles Elm syntax:
   - `type alias Name =` instead of `pub struct Name`
   - `fieldName : Type` instead of `pub field_name: Type`
   - `Maybe a` instead of `Option<T>`
   - Nested records, Lists

### Existing Tests to Extend
- `packages/buildamp/tests/sql.test.js` - Add parallel Elm parsing tests

### New Tests
```javascript
// packages/buildamp/tests/elm-parser.test.js

describe('Elm Type Parsing', () => {
    test('parses type alias with DatabaseId field', async () => {
        const { parseElmTypeForTest } = await import('../core/elm-parser.js');

        const elmCode = `
type alias User =
    { id : DatabaseId String
    , name : String
    }`;
        const types = parseElmTypeForTest(elmCode, 'User.elm');

        assert.strictEqual(types.length, 1);
        assert.strictEqual(types[0].name, 'User');
        assert.strictEqual(types[0].tableName, 'user');

        const idField = types[0].fields.find(f => f.name === 'id');
        assert.ok(idField.isPrimaryKey);
    });

    test('parses Maybe as optional', async () => {
        const elmCode = `
type alias Post =
    { id : DatabaseId String
    , subtitle : Maybe String
    }`;
        const types = parseElmTypeForTest(elmCode, 'Post.elm');
        const subtitleField = types[0].fields.find(f => f.name === 'subtitle');
        assert.ok(subtitleField.isOptional);
    });

    test('parses ForeignKey reference', async () => {
        const elmCode = `
type alias Comment =
    { id : DatabaseId String
    , userId : ForeignKey User String
    }`;
        const types = parseElmTypeForTest(elmCode, 'Comment.elm');
        const fkField = types[0].fields.find(f => f.name === 'userId');
        assert.strictEqual(fkField.referencedTable, 'user');
    });

    test('Elm output matches Rust output for equivalent model', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');
        const { parseElmTypeForTest } = await import('../core/elm-parser.js');

        const rustCode = `
pub struct Tag {
    pub id: DatabaseId<String>,
    pub name: String,
}`;
        const elmCode = `
type alias Tag =
    { id : DatabaseId String
    , name : String
    }`;

        const rustResult = parseRustStructForTest(rustCode, 'tag.rs');
        const elmResult = parseElmTypeForTest(elmCode, 'Tag.elm');

        // Normalize and compare
        assert.deepStrictEqual(
            normalizeFields(rustResult[0].fields),
            normalizeFields(elmResult[0].fields)
        );
    });
});
```

### Exit Criteria
- [ ] `elm-parser.js` parses all magic types
- [ ] Elm parser produces identical intermediate representation to Rust parser
- [ ] Parity test passes for Tag model

---

## Sprint 2: Parallel Model (Tag)

**Goal:** Migrate simplest model (Tag) to Elm. Both Rust and Elm versions exist. Outputs identical.

### Tasks
1. Create `app/horatio/web/src/Schema/Tag.elm`:
   ```elm
   module Schema.Tag exposing (Tag)

   import Framework.Schema exposing (..)

   type alias Tag =
       { id : DatabaseId String
       , name : String
       }
   ```

2. Update buildamp to accept `--schema-lang elm|rust` flag

3. Run both parsers, diff outputs

### Existing Tests
- `packages/buildamp/tests/sql.test.js` - Table name generation, FK detection

### New Tests
```javascript
// packages/buildamp/tests/migration-parity.test.js

describe('Migration Parity: Tag', () => {
    test('Elm Tag produces identical SQL to Rust Tag', async () => {
        const rustSql = await generateSqlFromRust('app/horatio/models/db/tag.rs');
        const elmSql = await generateSqlFromElm('app/horatio/web/src/Schema/Tag.elm');

        assert.strictEqual(normalizeSql(rustSql), normalizeSql(elmSql));
    });

    test('Elm Tag produces identical schema.json entry', async () => {
        const rustSchema = await generateSchemaFromRust('tag');
        const elmSchema = await generateSchemaFromElm('Tag');

        assert.deepStrictEqual(rustSchema, elmSchema);
    });
});
```

### Exit Criteria
- [ ] `Schema/Tag.elm` exists and compiles
- [ ] SQL output identical to Rust version
- [ ] schema.json entry identical

---

## Sprint 3: Full DB Model Migration

**Goal:** Migrate all 5 DB models to Elm. Remove Rust DB models.

### Models to Migrate
1. ~~Tag~~ (done in Sprint 2)
2. Guest
3. MicroblogItem
4. ItemComment
5. ItemTag (join table)

### Tasks
1. Create Elm versions of each model
2. Update foreign key references:
   ```elm
   type alias ItemComment =
       { id : DatabaseId String
       , itemId : ForeignKey MicroblogItem String
       , guestId : ForeignKey Guest String
       , parentId : Maybe (ForeignKey ItemComment String)
       , text : String
       , createdAt : Timestamp
       }
   ```

3. Update buildamp default to `--schema-lang elm`
4. Delete `app/horatio/models/db/*.rs`

### Existing Tests
- `packages/buildamp/tests/cross-model-e2e.test.js` - FK detection across models
- `packages/buildamp/tests/sql.test.js` - All SQL generation tests

### New Tests
```javascript
describe('Full Schema Migration', () => {
    test('generated schema.sql matches golden snapshot', async () => {
        const current = await generateFullSchema('elm');
        const golden = fs.readFileSync('tests/golden/schema.sql', 'utf-8');
        assert.strictEqual(normalizeSql(current), normalizeSql(golden));
    });

    test('all foreign keys detected from Elm models', async () => {
        const schema = await generateSchemaJson('elm');

        // item_comment references microblog_item and guest
        const itemComment = schema.tables.item_comment;
        assert.ok(itemComment.foreignKeys.some(fk =>
            fk.column === 'item_id' && fk.references.table === 'microblog_item'
        ));
        assert.ok(itemComment.foreignKeys.some(fk =>
            fk.column === 'guest_id' && fk.references.table === 'guest'
        ));
    });

    test('join table detected correctly', async () => {
        const schema = await generateSchemaJson('elm');
        assert.ok(schema.tables.item_tag.isJoinTable);
    });
});
```

### Exit Criteria
- [ ] All 5 DB models in Elm
- [ ] Rust DB models deleted
- [ ] Golden snapshot test passes
- [ ] FK detection tests pass
- [ ] Admin UI still works (join tables hidden, FKs shown)

---

## Sprint 4: API Models & Encoders

**Goal:** Replace elm-rs with Elm-native types + generated encoders/decoders.

### Tasks
1. Move API types to Elm:
   ```elm
   module Schema.Api.GetFeed exposing (..)

   type alias GetFeedReq =
       { host : Host
       , page : Maybe Int
       , limit : Maybe Int
       }

   type alias GetFeedRes =
       { items : List FeedItem
       , total : Int
       }
   ```

2. Create encoder/decoder generator:
   ```javascript
   // packages/buildamp/lib/generators/elm-codecs.js
   export function generateCodecs(elmTypes) {
       // Generate JSON encoders/decoders from Elm type definitions
   }
   ```

3. Update handler imports:
   ```elm
   -- Before
   import Api.Backend exposing (GetFeedReq, GetFeedRes)

   -- After
   import Schema.Api.GetFeed exposing (GetFeedReq, GetFeedRes)
   import Generated.Codecs exposing (getFeedReqDecoder, getFeedResEncoder)
   ```

4. Delete elm-rs dependency from Cargo.toml

### Existing Tests
- `packages/hamlet-server/tests/integration/elm-rs-codegen.test.js` - Adapt for new codecs

### New Tests
```javascript
describe('Generated Elm Codecs', () => {
    test('encoder round-trips through decoder', async () => {
        // Generate codecs
        const codecs = await generateCodecs('Schema/Api/GetFeed.elm');

        // Compile and run Elm test
        const result = await runElmTest(`
            import Generated.Codecs exposing (..)
            import Json.Encode as E
            import Json.Decode as D

            test =
                let
                    original = { host = "test", page = Just 1, limit = Nothing }
                    encoded = getFeedReqEncoder original
                    decoded = D.decodeValue getFeedReqDecoder encoded
                in
                decoded == Ok original
        `);
        assert.ok(result);
    });

    test('generated decoder handles snake_case JSON', async () => {
        const json = '{"host": "test", "page": 1, "limit": null}';
        // Verify decoder handles snake_case field names
    });
});
```

### Exit Criteria
- [ ] API types defined in Elm
- [ ] Codecs generated from Elm types
- [ ] Handlers use generated codecs
- [ ] elm-rs removed from Cargo.toml
- [ ] All handler tests pass

---

## Sprint 5: Cleanup & Template Sync

**Goal:** Remove all Rust model infrastructure. Update template.

### Tasks
1. Delete:
   - `app/horatio/models/` (all remaining Rust)
   - `src/framework/database_types.rs`
   - `src/framework/storage_types.rs`
   - `.buildamp/macros/` (proc macros)
   - elm-rs from Cargo.toml

2. Update `packages/create-buildamp/template/`:
   - Add `Schema/` directory with example models
   - Add `Framework/Schema.elm`
   - Remove Rust model examples
   - Update documentation

3. Update buildamp CLI:
   - Remove `--schema-lang` flag (Elm is now the only option)
   - Update help text

### Existing Tests
- All buildamp tests should still pass
- Template tests should still pass

### New Tests
```javascript
describe('Template Validation', () => {
    test('template has Schema directory', () => {
        const templatePath = 'packages/create-buildamp/template';
        assert.ok(fs.existsSync(path.join(templatePath, 'Schema')));
    });

    test('template has Framework/Schema.elm', () => {
        const schemaPath = 'packages/create-buildamp/template/web/src/Framework/Schema.elm';
        assert.ok(fs.existsSync(schemaPath));
    });

    test('template has no Rust models', () => {
        const modelsPath = 'packages/create-buildamp/template/models';
        assert.ok(!fs.existsSync(modelsPath));
    });
});
```

### Exit Criteria
- [ ] No Rust model files remain
- [ ] Template updated for Elm-first
- [ ] `buildamp gen` works with Elm models only
- [ ] All tests green

---

## Test Summary

| Test File | Sprint | Purpose |
|-----------|--------|---------|
| `tests/golden.test.js` | 0 | Regression baseline |
| `tests/elm-parser.test.js` | 1 | Elm parsing correctness |
| `tests/migration-parity.test.js` | 2 | Rust/Elm output equivalence |
| `tests/sql.test.js` (extended) | 3 | SQL generation from Elm |
| `tests/cross-model-e2e.test.js` (extended) | 3 | FK detection from Elm |
| `tests/elm-codecs.test.js` | 4 | Encoder/decoder generation |
| `tests/template.test.js` | 5 | Template structure validation |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SQL output drift | Golden snapshot comparison |
| FK detection breaks | Existing cross-model tests |
| Encoder/decoder mismatch | Round-trip tests |
| Handler breakage | Existing handler compilation tests |
| Admin UI breaks | Manual smoke test each sprint |

---

## Rollback Plan

Each sprint is atomic. If a sprint fails:

1. **Sprint 1-2:** Just delete new files, no changes to working code
2. **Sprint 3:** Restore Rust models from git, revert buildamp changes
3. **Sprint 4:** Restore elm-rs imports, revert handler changes
4. **Sprint 5:** No rollback needed (just cleanup)

Keep Rust models in git history until Sprint 5 is complete and validated.
