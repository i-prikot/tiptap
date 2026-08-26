# Portable BlockRole Contract

`@i-prikot/editor-schema` owns the portable `blockRole` document attribute.
It is intentionally headless: applications own labels, menus, permissions,
pricing hints, analytics, and any server-side resolution logic.

## Install

Install the schema package from GitHub Packages with compatible Tiptap v3 peers:

```bash
npm install @i-prikot/editor-schema @tiptap/core @tiptap/pm
```

Configure the `@i-prikot` GitHub Packages registry and authentication as
described in [GitHub Packages token guidance](github-packages-token.md) before
installing outside this workspace.

The schema package declares `@tiptap/core` and `@tiptap/pm` as peer
dependencies. A host must resolve one compatible copy of each runtime.
For release-boundary checks, build and pack schema before editor:

```bash
npm run build
npm pack --workspace=@i-prikot/editor-schema
npm pack --workspace=@i-prikot/editor
```

Install those archives in a clean consumer fixture and import only normal public
entry points. Do not use workspace source aliases for this check.

## Public API

```ts
import {
  BLOCK_ID_ATTRIBUTE,
  BlockRole,
  normalizeBlockRole,
  setBlockRoleAtPos,
} from '@i-prikot/editor-schema'
```

`BLOCK_ID_ATTRIBUTE` is `id`. `BlockRoleValue` is a host-defined non-empty
string or `null`. Configure the allowed values on `BlockRole`; values outside
that configuration normalize to `null`.

Install `BlockId` after schema-forming node extensions, then install `BlockRole`
immediately after it. `createExtensionKit` already follows this order. The Vue
package re-exports the same symbols as a convenience facade:

```ts
import { BlockRole, setBlockRoleAtPos } from '@i-prikot/editor'
```

`setBlockRoleAtPos(editor, pos, role)` accepts a position resolved by the host
menu. Pass a role configured by the host or `null` to clear a role. It changes
only supported direct children of `doc` and returns a typed success or
rejection result. Rejected calls do not modify the document.

`requestedRole` in a rejection result is normalized to a configured role or
`null`. Callers must not receive or log the raw value that was supplied to the
helper.

## Vue Configuration

Pass the available role labels and persisted values when `NotionEditor` is
initialized. The block actions menu shows these labels and uses the matching
values for document attributes:

```vue
<script setup lang="ts">
const blockRoles = [
  { label: 'Цена', value: 'pricing' },
  { label: 'Призыв к действию', value: 'cta' },
  { label: 'Кейсы', value: 'cases' },
  { label: 'Другое', value: 'other' },
] as const
</script>

<template>
  <NotionEditor
    :block-roles="blockRoles"
    document-id="page-42"
    base-url="https://example.test/page-42"
  />
</template>
```

When `blockRoles` is omitted, the editor accepts no block roles and does not
show a role group in the block actions menu. Changing `blockRoles` after creation does not reconfigure
the existing editor; remount it to apply a new list.

## Persistence And Rendering

Roles are valid only on supported direct `doc` children. The extension repairs
invalid top-level values and non-top-level roles in one transaction, excluded
from undo history. Valid interactive editor HTML round-trips as
`data-block-role`.

This release is JSON-only for public rendering: the renderer-safe extension kit
does not install `BlockRole`, so `renderDocument` never emits
`data-block-role`. SSR support requires separate approval.

## Host Compatibility Gate

Before a prerelease is promoted, the consuming service must compare its
production `BlockId` extension with this package's exported
`BLOCK_ID_ATTRIBUTE` (`id`) and verify ownership of that persisted attribute.
It must compare the complete supported-node list, not only a sample:
`table`, `paragraph`, `bulletList`, `orderedList`, `taskList`, `heading`,
`blockquote`, `codeBlock`, and `tocNode`. It must also verify that it registers
`BlockId` before `BlockRole`.

The consuming service must then install the packed archives, save and reload
representative persisted fixtures, and prove that `PagePricingBlockResolver`
finds only a direct-document `pricing` block with a valid `blockId`.

The host fixtures must cover valid roles, malformed legacy values, and roles
nested below list, task, table, callout, and spoiler wrappers. `cta`, `cases`,
and every nested `pricing` role must leave pricing resolution unchanged. The
host source, resolver, and persisted fixtures are not included in this
repository, so this workspace cannot certify that gate on its own. Promotion
remains blocked until the host records the comparison and actual-install test
results.

## Diagnostics

The contract permits only these operational messages:

- `console.debug('[BlockRole] normalize document', summary)` after a non-empty repair.
- `console.info('[BlockRole] role changed from menu', summary)` after a successful helper call.
- `console.warn('[BlockRole] role change skipped', summary)` after a rejected helper call.

Never log document JSON, HTML, text, or other block content. Valid editor
creation, typing, package registration, serialization, and rendering are silent.
