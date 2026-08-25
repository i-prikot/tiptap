# Schema Contract

`@i-prikot/editor-schema` publishes a versioned, machine-readable description of the JSON document accepted by the editor and renderer. Hosts can validate content, generate documentation, audit SSR coverage, and detect schema drift without importing source files or maintaining a second node registry.

## Installation

Configure npm for the `@i-prikot` GitHub Packages scope, then pin a released package version:

```bash
npm install --save-exact @i-prikot/editor-schema@0.5.0
```

Only the package entry points are public. Do not import `packages/schema/src/*`, workspace aliases, or private `dist` paths.

## Public API

The root entry and the optional `./schema-contract` entry expose the same contract API:

```ts
import {
  CURRENT_SCHEMA_VERSION,
  getSchemaContract,
  invalidDocuments,
  schemaValidationRules,
  validateSchemaDocument,
  validDocuments,
  type SchemaContract,
  type SchemaValidationResult,
} from '@i-prikot/editor-schema'

const contract: SchemaContract = getSchemaContract()
console.assert(contract.schemaVersion === CURRENT_SCHEMA_VERSION)
```

`getSchemaContract()` caches the canonical renderer-schema snapshot. `buildSchemaContract(extensions?)` creates a fresh snapshot and can audit a custom extension kit.

## Contract Structure

`SchemaContract` is JSON serializable and contains:

- `schemaVersion`: the current persisted-document schema version.
- `nodes`: node names, groups, content expressions, attributes, node traits, allowed parents and children, and HTML mappings.
- `marks`: mark names, attributes, applicable node types, and HTML mappings.
- `rules`: data-only validation metadata suitable for non-TypeScript consumers.

Every attribute declares its JSON type, default, required state, and enum where applicable. Node and mark catalogs are derived from the registered renderer extensions during contract construction; package tests compare them with the live ProseMirror schema.

The canonical roles are `pricing`, `cta`, and `cases`. `id` and `blockRole` are valid only on the supported direct children of `doc`. The legacy `blockId` attribute is rejected and is not part of any live node definition.

## Validation

Use `validateSchemaDocument` when a host needs the complete rule set:

```ts
const result: SchemaValidationResult = validateSchemaDocument(candidateJson)

if (!result.valid) {
  for (const error of result.errors) {
    console.error(error.rule, error.path, error.message)
  }
}
```

Validation covers registered node and mark names, ProseMirror content nesting, attribute types and enums, top-level `id`/`blockRole` placement, legacy `blockId`, and link/image URL schemes. Allowed schemes are `http`, `https`, `ftp`, `ftps`, `mailto`, `tel`, `callto`, `sms`, `cid`, and `xmpp`; relative URLs are accepted.

`schemaValidationRules` exposes the rule metadata with an executable `validate` member for TypeScript/JavaScript hosts. Consumers that need a pure JSON artifact should serialize `getSchemaContract()` instead.

## Fixtures

`validDocuments` and `invalidDocuments` are stable arrays of `{ key, description, document }`. Invalid fixtures also declare `expectedError`.

```ts
for (const fixture of validDocuments) {
  const result = validateSchemaDocument(fixture.document)
  if (!result.valid) throw new Error(`Contract regression: ${fixture.key}`)
}

for (const fixture of invalidDocuments) {
  const result = validateSchemaDocument(fixture.document)
  if (!result.errors.some((error) => error.rule === fixture.expectedError)) {
    throw new Error(`Missing rejection: ${fixture.key}`)
  }
}
```

The fixtures cover common blocks and marks, task/list nesting, tables, TOC, math, images with LQIP and intrinsic dimensions, safe and unsafe URLs, valid and invalid `id`/`blockRole`, malformed attributes, unknown nodes, invalid nesting, and legacy `blockId`.

## HTML Mapping

Each node and mark includes parse selectors plus a serializable render description. `parseRules` records tags, styles, priority, content elements, and string representations of complex attribute readers. `render` records the default DOM output structure and the Tiptap render function source when one exists.

This metadata lets hosts audit and document JSON-to-HTML coverage. It is not executable HTML and does not replace `renderDocument` from `@i-prikot/editor-renderer`. Hosts remain responsible for their final output sanitization policy.

## Versioning and Upgrades

The contract's `schemaVersion` equals `CURRENT_SCHEMA_VERSION`. Package semver and document schema version serve different purposes:

- Package minor releases may add public contract data, fixtures, or backward-compatible schema capabilities.
- A change to persisted JSON semantics must update `CURRENT_SCHEMA_VERSION`, add a migration, update the contract expectations, and update affected fixtures.
- Consumers should pin an exact package version, compare the incoming document version before validation, and run package fixtures through their own validation and SSR pipelines during upgrades.

For release review, build and pack the workspace package, install the tarball into a clean project with `npm ci`, and import only `@i-prikot/editor-schema` or `@i-prikot/editor-schema/schema-contract`.
