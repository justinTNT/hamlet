Tree-sitter Enhancement Plan
This plan outlines the specific steps to fully leverage our existing Tree-sitter infrastructure (
packages/buildamp/core/elm-parser-ts.js
) by removing legacy code and adding high-value capabilities.

Goal
To elevate the Hamlet framework's type safety, self-documentation, and validation capabilities by extracting richer data from the Elm CST (Concrete Syntax Tree) and cleaning up tech debt.


Proposed Changes
1. Cleanup: Remove Legacy Code
The file 
packages/buildamp/lib/generators/api.js
 currently contains a dual-path parser (Rust regex + Elm Tree-sitter). We will strip the Rust path.

[MODIFY] 
api.js
Remove 
parseApiAnnotations
 (Regex function).
Remove calls to 
rustTypeToElmType
.
Remove logic that checks for Rust files.
Ensure only 
parseElmApiDir
 is used.
2. Feature: Zero-Config Type Safety (TypeScript Generation)
We will generate 
.d.ts
 files so the Node.js server acts as a strictly typed client of the Elm logic.

[NEW] 
packages/buildamp/lib/generators/ts.js
Input: Elm AST (Records, Unions, Aliases).
Transformation:
String -> string
Int
 / Float -> number
Bool -> boolean
Maybe a -> a | null (or undefined depending on JSON usage)
List a -> Array<a>
CustomType -> Discriminated Unions (e.g., { type: 'Variant', ... }).
Output: elm-types.d.ts in the server's type root.

[MODIFY] 
packages/buildamp/lib/generators/index.js
Export the new generateTypeScriptDefinitions function.
3. Feature: Documentation as Code
We will make Elm doc comments ({-| ... -}) useful at runtime.

[MODIFY] 
packages/buildamp/core/elm-parser-ts.js
Update parsing logic to capture block_comment nodes immediately preceding type_alias_declaration or field_type nodes.
Expose a docComment field in the parsed model object.

[MODIFY] 
packages/buildamp/lib/generators/db.js
Generate SQL COMMENT ON TABLE and COMMENT ON COLUMN statements using the extracted docs.
This creates self-documenting databases.

[MODIFY] 
packages/buildamp/lib/generators/api.js
Add JSDoc comments to the generated Express routes for better IDE intelligence in api-routes.js.
4. Feature: Advanced Validation (Tagging)
We will support "Validation Tags" in Elm comments to generate runtime checks. Example Elm: email : String -- @validate email

[MODIFY] 
packages/buildamp/core/elm-parser-ts.js
Enhance 
unwrapApiAnnotations
 or create a new parseFieldTags helper.
Parse line comments for @tag value syntax.

[MODIFY] 
packages/buildamp/lib/generators/api.js
Update 
generateRoute
 to include validation logic.
Map tags to validation rules:
@validate email -> Joi.string().email() (or custom regex)
@min 10 -> if (val.length < 10) throw ...

Verification Plan

Automated Tests

Parser Tests: Update tests/parser.test.js to assert that:
Comments are correctly extracted.
Tags are correctly parsed from line comments.
TypeScript output matches expected string for complex Elm types.

Integration: Run npm run test to ensure the simplified api.js still correctly generates routes for the existing Elm method.

Manual Verification

Type Check: Inspect the generated d.ts file and try using it in server.js to see if VS Code provides autocompletion.
DB Check: Run the generated SQL migration and inspect the Postgres schema to see if comments appear on tables.

