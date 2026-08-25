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
- [x] Versioned (tied to CURRENT_SCHEMA_VERSION)
- [x] Machine-readable (structured TypeScript/JSON)
- [x] Publicly exported from the package entry point
- [x] Installable in a clean project via `npm ci`
- [x] Validated by package tests against real extensions

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

- [x] **Task 2.1: Extract HTML mapping specifications**

  Extend the schema contract builder to include HTML mapping for SSR.

  For each node and mark, extract:
  - [x] parseHTML rules: tag selectors, attribute mappings, priority, getAttrs functions (as string representations)
  - [x] renderHTML rules: element structure, attribute serialization
  - [x] Content element mappings (e.g., figcaption for image node)

  Store in a format that consumers can use to understand HTML ↔ JSON conversion without executing Tiptap code.

  **Logging:**
  - [x] DEBUG: Log HTML mapping extraction for each extension
  - [x] WARN: Log if parseHTML/renderHTML rules are complex (functions that can't be easily serialized)

  **Files to modify:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts`

  **Dependencies:**
  - [x] Blocked by Task 1.2

- [x] **Task 2.2: Document parent-child relationships**

  Add parent-child relationship documentation to the schema contract.

  For each node type, document:
  - [x] Allowed parent nodes (inferred from content model and group memberships)
  - [x] Allowed child nodes (from node's content spec: "inline*", "block+", etc.)
  - [x] Whether node is inline, block, or atom
  - [x] Whether node is draggable, selectable

  Parse Tiptap content expressions into structured rules:
  - [x] `"inline*"` → zero or more inline nodes
  - [x] `"block+"` → one or more block nodes
  - [x] `"paragraph+"` → one or more paragraph nodes

  **Logging:**
  - [x] DEBUG: Log content model parsing for each node
  - [x] DEBUG: Log inferred parent-child relationships

  **Files to modify:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts`

  **Dependencies:**
  - [x] Blocked by Task 1.2

### Phase 3: Fixtures for Validation

- [x] **Task 3.1: Create valid document fixtures**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/valid-documents.ts` with comprehensive valid document examples.

  Include fixtures for:
  - [x] Common blocks: paragraph, heading (levels 1-6), blockquote, codeBlock, horizontalRule
  - [x] Lists: bulletList, orderedList, taskList (with nested items)
  - [x] Table with resizable columns, merged cells, different alignments
  - [x] Images: with src, lqip, width, height, caption, alignment
  - [x] Marks: bold, italic, underline, strike, code, link, textStyle (color), highlight, subscript, superscript
  - [x] Mathematics: inlineMath and blockMath with latex
  - [x] TOC: tocNode with various configurations
  - [x] Block attributes: valid id on top-level blocks, valid blockRole (pricing, cta, cases)
  - [x] Nested structures: lists in blockquotes, images in tables

  Each fixture should have:
  - [x] `key`: unique identifier
  - [x] `description`: what the fixture demonstrates
  - [x] `document`: valid JSONContent

  **Logging:**
  - [x] DEBUG: Log when fixtures are loaded

  **Files to create:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/valid-documents.ts`

- [x] **Task 3.2: Create invalid document fixtures**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/invalid-documents.ts` with fixtures that should fail validation.

  Include fixtures for:
  - [x] Invalid id placement: id on nested paragraph, id on unsupported node types
  - [x] Invalid blockRole: blockRole on nested nodes, blockRole with unsupported values, blockRole on unsupported node types
  - [x] Unsafe URLs: javascript: scheme in href, data: scheme in src, file: scheme
  - [x] Unknown nodes: unsupported node type at top level, unknown nested nodes
  - [x] Invalid nesting: inline node where block expected, improper list nesting
  - [x] Malformed attributes: wrong type (string instead of number), invalid enum value
  - [x] Legacy blockId: document with deprecated blockId attribute

  Each fixture should have:
  - [x] `key`: unique identifier
  - [x] `description`: what validation should fail
  - [x] `document`: invalid JSONContent
  - [x] `expectedError`: validation rule that should fail

  **Logging:**
  - [x] DEBUG: Log when invalid fixtures are loaded

  **Files to create:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/invalid-documents.ts`

  **Dependencies:**
  - [ ] None (can be done in parallel with Task 3.1)

- [x] **Task 3.3: Create fixtures index and exports**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/index.ts` that re-exports all fixtures and provides helper types.

  Export:
  - [x] `validDocuments` - array of all valid fixtures
  - [x] `invalidDocuments` - array of all invalid fixtures
  - [x] `ValidFixture` type
  - [x] `InvalidFixture` type
  - [x] Helper function `getFixtureByKey(key)` to retrieve specific fixtures

  **Logging:**
  - [x] DEBUG: Log fixture counts on load

  **Files to create:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/fixtures/index.ts`

  **Dependencies:**
  - [x] Blocked by Task 3.1 and Task 3.2

### Phase 4: Public Exports

- [x] **Task 4.1: Create schema-contract index**

  Create `/home/www/tiptap/packages/schema/src/schema-contract/index.ts` that re-exports the complete schema contract API.

  Export:
  - [x] `buildSchemaContract` function
  - [x] `getSchemaContract()` - pre-built contract for convenience
  - [x] All types from types.ts
  - [x] All validation rules from rules.ts
  - [x] All fixtures from fixtures/index.ts
  - [x] `CURRENT_SCHEMA_VERSION` constant

  **Logging:**
  - [x] DEBUG: Log when schema contract module is imported

  **Files to create:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/index.ts`

  **Dependencies:**
  - [x] Blocked by Tasks 1.1, 1.2, 1.3, and 3.3

- [x] **Task 4.2: Add public export to package entry point**

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
  - [x] No additional logging needed (uses module-level exports)

  **Files to modify:**
  - [x] `/home/www/tiptap/packages/schema/src/index.ts`

  **Dependencies:**
  - [x] Blocked by Task 4.1

- [x] **Task 4.3: Update package.json exports**

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
  - [x] No logging (package.json modification)

  **Files to modify:**
  - [x] `/home/www/tiptap/packages/schema/package.json` (only if dedicated export path is needed)

  **Dependencies:**
  - [x] Blocked by Task 4.2

### Phase 5: Package Tests

- [x] **Task 5.1: Test schema contract generation**

  Create `/home/www/tiptap/test/schema/schema-contract.test.ts` to validate schema contract generation.

  Test cases:
  - [x] Contract includes CURRENT_SCHEMA_VERSION
  - [x] Contract includes all expected nodes from extension kit (paragraph, heading, blockquote, codeBlock, bulletList, orderedList, taskList, table, image, tocNode, etc.)
  - [x] Contract includes all expected marks (bold, italic, underline, strike, code, link, textStyle, highlight, subscript, superscript)
  - [x] Each node definition has required fields (name, attributes, group)
  - [x] Each mark definition has required fields (name, attributes)
  - [x] Attributes have correct types (id: string, blockRole: string | null, level: number, etc.)
  - [x] HTML mapping is present for nodes that define parseHTML/renderHTML

  **Logging:**
  - [x] DEBUG: Log contract validation steps
  - [x] INFO: Log successful contract validation

  **Files to create:**
  - [x] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [x] Blocked by Task 4.1

- [x] **Task 5.2: Test valid fixtures acceptance**

  Add test cases to `/home/www/tiptap/test/schema/schema-contract.test.ts` (or separate file) to validate that all valid fixtures are accepted by the editor.

  For each fixture in `validDocuments`:
  - [x] Create an editor instance with the document
  - [x] Verify no normalization transactions are triggered (BlockRole normalization should pass)
  - [x] Verify getJSON() returns the expected structure
  - [x] Verify getHTML() produces valid HTML without errors

  **Logging:**
  - [x] DEBUG: Log each fixture being validated
  - [x] INFO: Log fixture acceptance results

  **Files to modify:**
  - [x] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [x] Blocked by Task 5.1 and Task 3.3

- [x] **Task 5.3: Test invalid fixtures rejection**

  Add test cases to validate that invalid fixtures are properly rejected.

  For each fixture in `invalidDocuments`:
  - [x] Load the document into an editor instance
  - [x] Verify that the expected validation rule fails (normalization strips invalid attributes, unsupported nodes are rejected, etc.)
  - [x] Check that unsafe URLs are sanitized to '#'
  - [x] Check that nested blockRole attributes are stripped
  - [x] Check that invalid id attributes are rejected

  **Logging:**
  - [x] DEBUG: Log each invalid fixture being tested
  - [x] INFO: Log rejection confirmation

  **Files to modify:**
  - [x] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [x] Blocked by Task 5.2

- [x] **Task 5.4: Test public exports availability**

  Create `/home/www/tiptap/test/schema/public-exports.test.ts` to verify that the schema contract is importable from the built package.

  Test cases:
  - [x] Import `getSchemaContract` from `@i-prikot/editor-schema`
  - [x] Import `validDocuments`, `invalidDocuments` from `@i-prikot/editor-schema`
  - [x] Import types: `SchemaContract`, `NodeDefinition`, `MarkDefinition`
  - [x] Import validation rules from the package
  - [x] Verify all imports resolve without errors (this validates the package build and export map)

  This test should run against the built package (`dist/`) to ensure consumers can import after `npm install`.

  **Logging:**
  - [x] INFO: Log successful import validation

  **Files to create:**
  - [x] `/home/www/tiptap/test/schema/public-exports.test.ts`

  **Dependencies:**
  - [x] Blocked by Task 4.2

- [x] **Task 5.5: Test schema contract matches live extensions**

  Add test to verify the generated contract matches the actual registered extensions.

  Test cases:
  - [x] Build schema contract from `createExtensionKit`
  - [x] Create an editor instance with the same extension kit
  - [x] Compare contract node list with editor.schema.nodes
  - [x] Compare contract mark list with editor.schema.marks
  - [x] Verify attribute definitions match `node.attrs` specs from editor.schema
  - [x] Verify no extensions are missing from the contract
  - [x] Verify no phantom extensions exist in contract that aren't in the editor

  **Logging:**
  - [x] DEBUG: Log node/mark comparison
  - [x] WARN: Log mismatches between contract and live schema

  **Files to modify:**
  - [x] `/home/www/tiptap/test/schema/schema-contract.test.ts`

  **Dependencies:**
  - [x] Blocked by Task 5.1

### Phase 6: Documentation

- [x] **Task 6.1: Document schema contract usage**

  Create `/home/www/tiptap/docs/schema-contract.md` with comprehensive documentation for consuming the schema contract.

  Sections:
  - [x] **Overview**: Purpose of the schema contract, why it exists
  - [x] **Installation**: How to install `@i-prikot/editor-schema` in a consumer project
  - [x] **Importing the contract**: Example imports for TypeScript and JavaScript consumers
  - [x] **Contract structure**: Explanation of SchemaContract, NodeDefinition, MarkDefinition
  - [x] **Validation rules**: How to use the exported validation rules
  - [x] **Fixtures**: How to use validDocuments and invalidDocuments for testing
  - [x] **Schema version**: How to check CURRENT_SCHEMA_VERSION and handle migrations
  - [x] **HTML mapping**: How to use HTML parsing/rendering specs for SSR
  - [x] **Examples**: Complete code examples for common use cases (validation, migration, SSR)

  **Logging:**
  - [x] No logging (documentation file)

  **Files to create:**
  - [x] `/home/www/tiptap/docs/schema-contract.md`

  **Dependencies:**
  - [x] Blocked by Task 4.2 (public API must be complete)

- [x] **Task 6.2: Update ARCHITECTURE.md**

  Update `/home/www/tiptap/.ai-factory/ARCHITECTURE.md` to document the schema contract as part of the `@i-prikot/editor-schema` public API.

  Add to the package description for `@i-prikot/editor-schema`:
  - [x] Schema contract export: `getSchemaContract()`, fixtures, validation rules
  - [x] Contract versioning tied to CURRENT_SCHEMA_VERSION
  - [x] Purpose: enable external validation, documentation, and SSR without duplicating schema manually

  Update the public entry points table to include schema contract exports.

  **Logging:**
  - [x] No logging (documentation file)

  **Files to modify:**
  - [x] `/home/www/tiptap/.ai-factory/ARCHITECTURE.md`

  **Dependencies:**
  - [x] Blocked by Task 6.1

- [x] **Task 6.3: Add inline code documentation**

  Add comprehensive JSDoc comments to all public exports in the schema-contract module.

  Document:
  - [x] `buildSchemaContract()` - purpose, return value, usage
  - [x] `getSchemaContract()` - cached vs. fresh contract
  - [x] `SchemaContract`, `NodeDefinition`, `MarkDefinition` interfaces - all fields explained
  - [x] Validation rules - what each rule checks, examples
  - [x] Fixtures - what each fixture demonstrates, how to use in tests

  Ensure all JSDoc comments include `@example` blocks for common use cases.

  **Logging:**
  - [x] No logging (code comments)

  **Files to modify:**
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/types.ts`
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/builder.ts`
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/rules.ts`
  - [x] `/home/www/tiptap/packages/schema/src/schema-contract/index.ts`

  **Dependencies:**
  - [x] Blocked by Tasks 1.1, 1.2, 1.3, 4.1

## Acceptance Criteria

- [x] `@i-prikot/editor-schema` exports `getSchemaContract()`, `validDocuments`, `invalidDocuments`, and all types
- [x] Schema contract includes schemaVersion matching CURRENT_SCHEMA_VERSION
- [x] Schema contract includes all nodes and marks from extension kits
- [x] Attributes have type, default, and enum information
- [x] HTML mapping specs are included for SSR support
- [x] Parent-child relationships are documented
- [x] Validation rules for id, blockRole, URLs, and legacy blockId are exported
- [x] Valid fixtures pass editor validation without normalization
- [x] Invalid fixtures are properly rejected or normalized
- [x] Tests verify contract matches live extensions
- [x] Tests verify public exports are importable from built package
- [x] Documentation explains contract usage for external consumers
- [x] Running `npm ci` in a clean project and importing the contract works
- [x] Changing the JSON schema requires updating contract and tests

## Verification Evidence

- RED: `npm run test:package-public-api` failed because the clean-consumer verifier performed two full installs and cleanup masked the timeout with `ENOTEMPTY`.
- RED: `LOG_LEVEL=debug npm run test:package-public-api` reached the clean `npm ci` consumer and failed declaration checking with TypeScript 6 `TS5112`; the isolated command now passes `--ignoreConfig`.
- GREEN: `LOG_LEVEL=debug npm run test:package-public-api` passed 5/5 tests, including fresh builds, packed tarballs, clean `npm ci`, declaration checks, root/subpath runtime imports, and Vite consumer builds.
- GREEN: `npx vitest run test/schema/schema-contract.test.ts test/schema/public-exports.test.ts test/editor/nodes/image-node.integration.test.ts --reporter=verbose` passed 17/17 tests.
- GREEN: `npx vitest run test/schema/extensions/block-role.test.ts test/renderer/render-document.test.ts --reporter=verbose` passed 25/25 regression tests.
- GREEN: `npm run typecheck`, schema workspace lint, changed-file lint, and `git diff --check` passed.

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
