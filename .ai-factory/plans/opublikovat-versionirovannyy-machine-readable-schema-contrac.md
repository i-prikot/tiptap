<!-- handoff:task:bb337b67-ca69-499d-bccd-028faa9db5ae -->
# Publish Versioned Machine-Readable Schema Contract

**Branch:** feature/machine-readable-schema-contract-i-priko-bb337b
**Created:** 2026-08-25
**Mode:** Full

## Overview

Create and publish a versioned machine-readable schema contract for `@i-prikot/editor-schema` that serves as the single source of truth for host applications like Tinyfy. The contract will expose node/mark definitions, attributes, parent-child relationships, HTML mappings, validation rules, and fixtures for testing.

## Context

Tinyfy currently maintains JSON schema manifests manually. This plan establishes `@i-prikot/editor-schema` as the authoritative source by exporting a structured schema contract that Tinyfy and other consumers can import directly from the published package without workspace links or private imports.

The schema contract must be:
- [ ] Versioned (tied to CURRENT_SCHEMA_VERSION)
- [ ] Machine-readable (structured TypeScript/JSON)
- [ ] Publicly exported from the package entry point
- [ ] Installable in a clean project via `npm ci`
- [ ] Validated by package tests against real extensions

## Settings

- [ ] **Testing:** yes - comprehensive test coverage required
- [ ] **Logging:** verbose - detailed DEBUG logs during development
- [ ] **Docs:** yes - mandatory documentation checkpoint at completion

## Tasks

### Phase 1: Schema Contract Core Structure

- [x] **Task 1.1: Define schema contract types**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/types.ts` with TypeScript interfaces for the schema contract structure.

  Define:
  - [x] `SchemaContract` - root interface with `schemaVersion`, `nodes`, `marks`, `rules`
  - [x] `NodeDefinition` - node name, attributes (type, default, enum), content spec, group
  - [x] `MarkDefinition` - mark name, attributes, applicable node types
  - [x] `AttributeDefinition` - name, type (string, number, boolean, enum), default value, allowed values for enums
  - [x] `ValidationRule` - rule name, description, validation function signature
  - [x] `HTMLMapping` - parseHTML and renderHTML specifications for nodes/marks

  Ensure all types are exported and support JSON serialization.

  **Logging:**
  - [x] DEBUG: Log when types are imported by other modules

  **Files to create:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/types.ts`

- [x] **Task 1.2: Implement schema contract builder**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts` that introspects the registered extension kit to generate the contract.

  Implement:
  - [x] `buildSchemaContract()` - main function that:
    - [x] Introspects `createExtensionKit` and `createRendererExtensionKit` to extract all nodes and marks
    - [x] Extracts attribute definitions from each extension's `addAttributes()` and `addGlobalAttributes()`
    - [x] Maps HTML parsing/rendering rules from `parseHTML()` and `renderHTML()`
    - [x] Documents content model (which nodes can contain which children)
    - [x] Includes CURRENT_SCHEMA_VERSION from migrations
  - [x] `extractNodeDefinition(extension)` - helper to convert Tiptap extension to NodeDefinition
  - [x] `extractMarkDefinition(extension)` - helper to convert Tiptap mark to MarkDefinition
  - [x] `extractAttributes(extension)` - helper to extract attribute specs

  **Logging:**
  - [x] DEBUG: Log each extension being processed
  - [x] DEBUG: Log attribute extraction for each node/mark
  - [x] WARN: Log if an extension lacks parseHTML/renderHTML

  **Files to create:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts`

  **Dependencies:**
  - [x] Blocked by Task 1.1 (types must exist first)

- [x] **Task 1.3: Document validation rules in contract**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/rules.ts` that exports structured validation rules.

  Document rules as machine-readable objects:
  - [x] `id` attribute: only allowed on direct `doc` children, specific node types (TOP_LEVEL_BLOCK_ID_NODE_TYPES)
  - [x] `blockRole` attribute: only allowed on TOP_LEVEL_BLOCK_ID_NODE_TYPES, must be from configured roles list (pricing, cta, cases)
  - [x] URL sanitization: link `href` and image `src` must pass `sanitizeUrl` with allowed schemes (http, https, ftp, ftps, mailto, tel, callto, sms, cid, xmpp)
  - [x] Legacy `blockId` attribute: not created by new editor, not serialized
  - [x] Nested role stripping: blockRole stripped from nodes not at depth 0

  Each rule should export:
  - [x] Rule name/ID
  - [x] Affected attributes/nodes
  - [x] Validation logic as a typed function
  - [x] Human-readable description

  **Logging:**
  - [x] DEBUG: Log when rules are loaded

  **Files to create:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/rules.ts`

### Phase 2: HTML Mapping & Parent-Child Relationships

- [ ] **Task 2.1: Extract HTML mapping specifications**

  Extend the schema contract builder to include HTML mapping for SSR.

  For each node and mark, extract:
  - [ ] parseHTML rules: tag selectors, attribute mappings, priority, getAttrs functions (as string representations)
  - [ ] renderHTML rules: element structure, attribute serialization
  - [ ] Content element mappings (e.g., figcaption for image node)

  Store in a format that consumers can use to understand HTML ↔ JSON conversion without executing Tiptap code.

  **Logging:**
  - [ ] DEBUG: Log HTML mapping extraction for each extension
  - [ ] WARN: Log if parseHTML/renderHTML rules are complex (functions that can't be easily serialized)

  **Files to modify:**
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts`

  **Dependencies:**
  - [ ] Blocked by Task 1.2

- [ ] **Task 2.2: Document parent-child relationships**

  Add parent-child relationship documentation to the schema contract.

  For each node type, document:
  - [ ] Allowed parent nodes (inferred from content model and group memberships)
  - [ ] Allowed child nodes (from node's content spec: "inline*", "block+", etc.)
  - [ ] Whether node is inline, block, or atom
  - [ ] Whether node is draggable, selectable

  Parse Tiptap content expressions into structured rules:
  - [ ] `"inline*"` → zero or more inline nodes
  - [ ] `"block+"` → one or more block nodes
  - [ ] `"paragraph+"` → one or more paragraph nodes

  **Logging:**
  - [ ] DEBUG: Log content model parsing for each node
  - [ ] DEBUG: Log inferred parent-child relationships

  **Files to modify:**
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts`

  **Dependencies:**
  - [ ] Blocked by Task 1.2

### Phase 3: Fixtures for Validation

- [ ] **Task 3.1: Create valid document fixtures**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/valid-documents.ts` with comprehensive valid document examples.

  Include fixtures for:
  - [ ] Common blocks: paragraph, heading (levels 1-6), blockquote, codeBlock, horizontalRule
  - [ ] Lists: bulletList, orderedList, taskList (with nested items)
  - [ ] Table with resizable columns, merged cells, different alignments
  - [ ] Images: with src, lqip, width, height, caption, alignment
  - [ ] Marks: bold, italic, underline, strike, code, link, textStyle (color), highlight, subscript, superscript
  - [ ] Mathematics: inlineMath and blockMath with latex
  - [ ] TOC: tocNode with various configurations
  - [ ] Block attributes: valid id on top-level blocks, valid blockRole (pricing, cta, cases)
  - [ ] Nested structures: lists in blockquotes, images in tables

  Each fixture should have:
  - [ ] `key`: unique identifier
  - [ ] `description`: what the fixture demonstrates
  - [ ] `document`: valid JSONContent

  **Logging:**
  - [ ] DEBUG: Log when fixtures are loaded

  **Files to create:**
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/valid-documents.ts`

- [ ] **Task 3.2: Create invalid document fixtures**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/invalid-documents.ts` with fixtures that should fail validation.

  Include fixtures for:
  - [ ] Invalid id placement: id on nested paragraph, id on unsupported node types
  - [ ] Invalid blockRole: blockRole on nested nodes, blockRole with unsupported values, blockRole on unsupported node types
  - [ ] Unsafe URLs: javascript: scheme in href, data: scheme in src, file: scheme
  - [ ] Unknown nodes: unsupported node type at top level, unknown nested nodes
  - [ ] Invalid nesting: inline node where block expected, improper list nesting
  - [ ] Malformed attributes: wrong type (string instead of number), invalid enum value
  - [ ] Legacy blockId: document with deprecated blockId attribute

  Each fixture should have:
  - [ ] `key`: unique identifier
  - [ ] `description`: what validation should fail
  - [ ] `document`: invalid JSONContent
  - [ ] `expectedError`: validation rule that should fail

  **Logging:**
  - [ ] DEBUG: Log when invalid fixtures are loaded

  **Files to create:**
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/invalid-documents.ts`

  **Dependencies:**
  - [ ] None (can be done in parallel with Task 3.1)

- [ ] **Task 3.3: Create fixtures index and exports**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/index.ts` that re-exports all fixtures and provides helper types.

  Export:
  - [ ] `validDocuments` - array of all valid fixtures
  - [ ] `invalidDocuments` - array of all invalid fixtures
  - [ ] `ValidFixture` type
  - [ ] `InvalidFixture` type
  - [ ] Helper function `getFixtureByKey(key)` to retrieve specific fixtures

  **Logging:**
  - [ ] DEBUG: Log fixture counts on load

  **Files to create:**
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/index.ts`

  **Dependencies:**
  - [ ] Blocked by Task 3.1 and Task 3.2

### Phase 4: Public Exports

- [ ] **Task 4.1: Create schema-contract index**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/index.ts` that re-exports the complete schema contract API.

  Export:
  - [ ] `buildSchemaContract` function
  - [ ] `getSchemaContract()` - pre-built contract for convenience
  - [ ] All types from types.ts
  - [ ] All validation rules from rules.ts
  - [ ] All fixtures from fixtures/index.ts
  - [ ] `CURRENT_SCHEMA_VERSION` constant

  **Logging:**
  - [ ] DEBUG: Log when schema contract module is imported

  **Files to create:**
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/index.ts`

  **Dependencies:**
  - [ ] Blocked by Tasks 1.1, 1.2, 1.3, and 3.3

- [ ] **Task 4.2: Add public export to package entry point**

  Modify `/home/www/tiptap/packages/schema/src/index.ts` to export the schema contract from the main package entry.

  Add export statement:
  ```typescript
  export * from './schema-contract/index.js'
  ```

  This makes the contract importable as:
  ```typescript
  import { getSchemaContract, validDocuments, invalidDocuments } from '@i-prikot/editor-schema'
  ```

  **Logging:**
  - [ ] No additional logging needed (uses module-level exports)

  **Files to modify:**
  - [ ] `/home/www/tiptap/packages/schema/src/index.ts`

  **Dependencies:**
  - [ ] Blocked by Task 4.1

- [ ] **Task 4.3: Update package.json exports**

  Verify that `/home/www/tiptap/packages/schema/package.json` exports configuration properly includes the new schema contract in the built package.

  The existing `exports` configuration should already cover the schema contract since it exports `./dist/index.js`. Verify that TypeScript compilation includes the new files in `dist/`.

  If needed, add a dedicated export path:
  ```json
  "./schema-contract": {
    "types": "./dist/schema-contract/index.d.ts",
    "import": "./dist/schema-contract/index.js"
  }
  ```

  **Logging:**
  - [ ] No logging (package.json modification)

  **Files to modify:**
  - [ ] `/home/www/tiptap/packages/schema/package.json` (only if dedicated export path is needed)

  **Dependencies:**
  - [ ] Blocked by Task 4.2

### Phase 5: Package Tests

- [ ] **Task 5.1: Test schema contract generation**

  Create `/home/www/tiptap/test/schema/schema-contract.test.ts` to validate schema contract generation.

  Test cases:
  - [ ] Contract includes CURRENT_SCHEMA_VERSION
  - [ ] Contract includes all expected nodes from extension kit (paragraph, heading, blockquote, codeBlock, bulletList, orderedList, taskList, table, image, tocNode, etc.)
  - [ ] Contract includes all expected marks (bold, italic, underline, strike, code, link, textStyle, highlight, subscript, superscript)
  - [ ] Each node definition has required fields (name, attributes, group)
  - [ ] Each mark definition has required fields (name, attributes)
  - [ ] Attributes have correct types (id: string, blockRole: string | null, level: number, etc.)
  - [ ] HTML mapping is present for nodes that define parseHTML/renderHTML

  **Logging:**
  - [ ] DEBUG: Log contract validation steps
  - [ ] INFO: Log successful contract validation

  **Files to create:**
  - [ ] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [ ] Blocked by Task 4.1

- [ ] **Task 5.2: Test valid fixtures acceptance**

  Add test cases to `/home/www/tiptap/test/schema/schema-contract.test.ts` (or separate file) to validate that all valid fixtures are accepted by the editor.

  For each fixture in `validDocuments`:
  - [ ] Create an editor instance with the document
  - [ ] Verify no normalization transactions are triggered (BlockRole normalization should pass)
  - [ ] Verify getJSON() returns the expected structure
  - [ ] Verify getHTML() produces valid HTML without errors

  **Logging:**
  - [ ] DEBUG: Log each fixture being validated
  - [ ] INFO: Log fixture acceptance results

  **Files to modify:**
  - [ ] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [ ] Blocked by Task 5.1 and Task 3.3

- [ ] **Task 5.3: Test invalid fixtures rejection**

  Add test cases to validate that invalid fixtures are properly rejected.

  For each fixture in `invalidDocuments`:
  - [ ] Load the document into an editor instance
  - [ ] Verify that the expected validation rule fails (normalization strips invalid attributes, unsupported nodes are rejected, etc.)
  - [ ] Check that unsafe URLs are sanitized to '#'
  - [ ] Check that nested blockRole attributes are stripped
  - [ ] Check that invalid id attributes are rejected

  **Logging:**
  - [ ] DEBUG: Log each invalid fixture being tested
  - [ ] INFO: Log rejection confirmation

  **Files to modify:**
  - [ ] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [ ] Blocked by Task 5.2

- [ ] **Task 5.4: Test public exports availability**

  Create `/home/www/tiptap/test/schema/public-exports.test.ts` to verify that the schema contract is importable from the built package.

  Test cases:
  - [ ] Import `getSchemaContract` from `@i-prikot/editor-schema`
  - [ ] Import `validDocuments`, `invalidDocuments` from `@i-prikot/editor-schema`
  - [ ] Import types: `SchemaContract`, `NodeDefinition`, `MarkDefinition`
  - [ ] Import validation rules from the package
  - [ ] Verify all imports resolve without errors (this validates the package build and export map)

  This test should run against the built package (`dist/`) to ensure consumers can import after `npm install`.

  **Logging:**
  - [ ] INFO: Log successful import validation

  **Files to create:**
  - [ ] `/home/www/tiptap/test/schema/public-exports.test.ts`

  **Dependencies:**
  - [ ] Blocked by Task 4.2

- [ ] **Task 5.5: Test schema contract matches live extensions**

  Add test to verify the generated contract matches the actual registered extensions.

  Test cases:
  - [ ] Build schema contract from `createExtensionKit`
  - [ ] Create an editor instance with the same extension kit
  - [ ] Compare contract node list with editor.schema.nodes
  - [ ] Compare contract mark list with editor.schema.marks
  - [ ] Verify attribute definitions match `node.attrs` specs from editor.schema
  - [ ] Verify no extensions are missing from the contract
  - [ ] Verify no phantom extensions exist in contract that aren't in the editor

  **Logging:**
  - [ ] DEBUG: Log node/mark comparison
  - [ ] WARN: Log mismatches between contract and live schema

  **Files to modify:**
  - [ ] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [ ] Blocked by Task 5.1

### Phase 6: Documentation

- [ ] **Task 6.1: Document schema contract usage**

  Create `/home/www/tiptap/docs/schema-contract.md` with comprehensive documentation for consuming the schema contract.

  Sections:
  - [ ] **Overview**: Purpose of the schema contract, why it exists
  - [ ] **Installation**: How to install `@i-prikot/editor-schema` in a consumer project
  - [ ] **Importing the contract**: Example imports for TypeScript and JavaScript consumers
  - [ ] **Contract structure**: Explanation of SchemaContract, NodeDefinition, MarkDefinition
  - [ ] **Validation rules**: How to use the exported validation rules
  - [ ] **Fixtures**: How to use validDocuments and invalidDocuments for testing
  - [ ] **Schema version**: How to check CURRENT_SCHEMA_VERSION and handle migrations
  - [ ] **HTML mapping**: How to use HTML parsing/rendering specs for SSR
  - [ ] **Examples**: Complete code examples for common use cases (validation, migration, SSR)

  **Logging:**
  - [ ] No logging (documentation file)

  **Files to create:**
  - [ ] `/home/www/tiptap/docs/schema-contract.md`

  **Dependencies:**
  - [ ] Blocked by Task 4.2 (public API must be complete)

- [ ] **Task 6.2: Update ARCHITECTURE.md**

  Update `/home/www/tiptap/.ai-factory/ARCHITECTURE.md` to document the schema contract as part of the `@i-prikot/editor-schema` public API.

  Add to the package description for `@i-prikot/editor-schema`:
  - [ ] Schema contract export: `getSchemaContract()`, fixtures, validation rules
  - [ ] Contract versioning tied to CURRENT_SCHEMA_VERSION
  - [ ] Purpose: enable external validation, documentation, and SSR without duplicating schema manually

  Update the public entry points table to include schema contract exports.

  **Logging:**
  - [ ] No logging (documentation file)

  **Files to modify:**
  - [ ] `/home/www/tiptap/.ai-factory/ARCHITECTURE.md`

  **Dependencies:**
  - [ ] Blocked by Task 6.1

- [ ] **Task 6.3: Add inline code documentation**

  Add comprehensive JSDoc comments to all public exports in the schema-contract module.

  Document:
  - [ ] `buildSchemaContract()` - purpose, return value, usage
  - [ ] `getSchemaContract()` - cached vs. fresh contract
  - [ ] `SchemaContract`, `NodeDefinition`, `MarkDefinition` interfaces - all fields explained
  - [ ] Validation rules - what each rule checks, examples
  - [ ] Fixtures - what each fixture demonstrates, how to use in tests

  Ensure all JSDoc comments include `@example` blocks for common use cases.

  **Logging:**
  - [ ] No logging (code comments)

  **Files to modify:**
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/types.ts`
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts`
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/rules.ts`
  - [ ] `/home/www/tiptap/packages/schema/src/schema-contract/index.ts`

  **Dependencies:**
  - [ ] Blocked by Tasks 1.1, 1.2, 1.3, 4.1

## Acceptance Criteria

- [ ] `@i-prikot/editor-schema` exports `getSchemaContract()`, `validDocuments`, `invalidDocuments`, and all types
- [ ] Schema contract includes schemaVersion matching CURRENT_SCHEMA_VERSION
- [ ] Schema contract includes all nodes and marks from extension kits
- [ ] Attributes have type, default, and enum information
- [ ] HTML mapping specs are included for SSR support
- [ ] Parent-child relationships are documented
- [ ] Validation rules for id, blockRole, URLs, and legacy blockId are exported
- [ ] Valid fixtures pass editor validation without normalization
- [ ] Invalid fixtures are properly rejected or normalized
- [ ] Tests verify contract matches live extensions
- [ ] Tests verify public exports are importable from built package
- [ ] Documentation explains contract usage for external consumers
- [ ] Running `npm ci` in a clean project and importing the contract works
- [ ] Changing the JSON schema requires updating contract and tests

## Commit Plan

**Checkpoint 1** (after Task 1.3):
```
feat(schema): add schema contract type definitions and builder

- [ ] Define TypeScript interfaces for schema contract structure
- [ ] Implement schema contract builder that introspects extension kits
- [ ] Document validation rules as machine-readable objects
- [ ] Export contract types and builder for testing
```

**Checkpoint 2** (after Task 2.2):
```
feat(schema): add HTML mappings and parent-child relationships to contract

- [ ] Extract HTML parsing/rendering specs from extensions
- [ ] Document parent-child relationships from content models
- [ ] Parse Tiptap content expressions into structured rules
```

**Checkpoint 3** (after Task 3.3):
```
feat(schema): add comprehensive validation fixtures

- [ ] Create valid document fixtures for all node/mark types
- [ ] Create invalid document fixtures for validation testing
- [ ] Export fixture collections and helper types
```

**Checkpoint 4** (after Task 4.3):
```
feat(schema): export schema contract from public package entry

- [ ] Add schema-contract index with all exports
- [ ] Export contract from main package entry point
- [ ] Verify package.json exports configuration
```

**Checkpoint 5** (after Task 5.5):
```
test(schema): add comprehensive schema contract tests

- [ ] Test contract generation against live extensions
- [ ] Validate all valid fixtures are accepted
- [ ] Validate all invalid fixtures are rejected
- [ ] Test public exports availability from built package
```

**Checkpoint 6** (after Task 6.3):
```
docs(schema): document schema contract usage

- [ ] Add schema-contract.md with usage examples
- [ ] Update ARCHITECTURE.md with contract description
- [ ] Add JSDoc comments to all public exports
```

## Notes

- [ ] The schema contract must remain in sync with the actual extensions. Any schema change requires updating the contract.
- [ ] Fixtures should be comprehensive but not exhaustive - focus on representative examples and edge cases.
- [ ] URL sanitization rules are already implemented in `sanitizeUrl()` - the contract documents them rather than re-implementing.
- [ ] The contract is generated from the extension kits, not manually maintained, to ensure accuracy.
- [ ] External consumers like Tinyfy will use the contract for validation without running the full editor.
