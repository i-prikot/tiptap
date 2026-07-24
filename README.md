# Tinyfy Tiptap Editor

Tinyfy Tiptap Editor is a Vue 3 + Vite + TypeScript implementation of a Notion-like rich text editor built on Tiptap v3. The repository contains npm workspaces for the editor, its schema, and an optional static renderer, plus a local Vite playground for development.

The current editor includes rich text blocks, headings, lists, task lists, tables, image nodes, table of contents support, floating toolbars, slash commands, mention and emoji menus, light/dark theme switching, local editing mode, optional Tiptap Cloud collaboration, and an optional AI token flow placeholder.

> Package entry points: Tinyfy consumes `NotionEditor` from `@i-prikot/editor` and the stylesheet from `@i-prikot/editor/style.css`. Resolve `@i-prikot/editor-schema` whenever it is required by the cabinet or the editor dependency graph.

## Tech Stack

- **Runtime:** Vue 3, TypeScript, Vite
- **Editor core:** Tiptap v3, ProseMirror, StarterKit, custom extensions and Vue NodeViews
- **Collaboration:** optional Yjs + `@hocuspocus/provider` + Tiptap collaboration extensions
- **Positioning/UI:** Floating UI, Vue components, CSS design tokens
- **Math:** KaTeX styles and Tiptap mathematics extension

## Installation

Prerequisites:

- Node.js compatible with Vite 6 and TypeScript 5
- npm, using the checked-in `package-lock.json`

Install dependencies:

```bash
npm install
```

## Local Development

Start the Vite dev server:

```bash
npm run dev
```

The script runs `vite --host 127.0.0.1`, so Vite binds to localhost and prints the local URL to open in the browser.

Run TypeScript checks:

```bash
npm run typecheck
```

Create a production build:

```bash
npm run build
```

`npm run build` first runs `vue-tsc --noEmit`, then builds the Vite app.

## Runtime Modes

The editor works without collaboration or AI configuration. In that local mode, content is edited in the browser with the normal Tiptap history stack.

When collaboration is configured, `App.vue` passes a room id to `NotionEditor` based on the current URL path. The collaboration document name is built from `VITE_TIPTAP_COLLAB_DOC_PREFIX` plus that room id. Add `?noCollab=1` to the URL to force local mode even when collaboration variables are present.

If collaboration or AI is configured but token retrieval fails, the corresponding provider sets a setup error that is surfaced by the existing editor loading/error UI.

## Environment Variables

All runtime variables use Vite's `VITE_` prefix and are read from `import.meta.env`.

| Variable                        | Purpose                                       | Default / fallback                          | Notes                                                                                                                   |
| ------------------------------- | --------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `VITE_TIPTAP_COLLAB_APP_ID`     | Enables Tiptap Cloud collaboration when set.  | Empty string; collaboration is disabled.    | Required for collaboration. Keep production app configuration outside the frontend when possible.                       |
| `VITE_TIPTAP_COLLAB_TOKEN_URL`  | Endpoint used to request a collaboration JWT. | `/api/collaboration`                        | Used with `POST` when no static collaboration token is provided.                                                        |
| `VITE_TIPTAP_COLLAB_TOKEN`      | Static collaboration JWT.                     | Empty string; fetch from token URL instead. | Suitable only for local development. Do not ship long-lived secrets in frontend builds.                                 |
| `VITE_TIPTAP_COLLAB_DOC_PREFIX` | Prefix added before the URL-derived room id.  | Empty string                                | Useful for separating Tinyfy environments or tenants.                                                                   |
| `VITE_TIPTAP_AI_APP_ID`         | Marks the AI flow as configured when set.     | Empty string; AI flow is disabled.          | The paid Tiptap AI extension is not included in this port, so AI UI remains hidden unless the extension is added later. |
| `VITE_TIPTAP_AI_TOKEN_URL`      | Endpoint used to request an AI JWT.           | `/api/ai`                                   | Used with `POST` to obtain a short-lived AI JWT; do not expose AI tokens through Vite environment variables.            |

Example local `.env` shape:

```bash
VITE_TIPTAP_COLLAB_APP_ID=
VITE_TIPTAP_COLLAB_TOKEN_URL=/api/collaboration
VITE_TIPTAP_COLLAB_DOC_PREFIX=tinyfy-
VITE_TIPTAP_AI_APP_ID=
VITE_TIPTAP_AI_TOKEN_URL=/api/ai
```

Leave `APP_ID` values empty to run fully locally.

## Project Structure

| Path                                | Purpose                                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                      | npm package metadata and scripts for dev, type checking, and build.                                                                                             |
| `vite.config.ts`                    | Vite configuration with the Vue plugin.                                                                                                                         |
| `src/main.ts`                       | Browser entrypoint; imports global editor styles and mounts `App.vue`.                                                                                          |
| `src/App.vue`                       | Demo app shell; derives the document room from the URL and renders `NotionEditor`.                                                                              |
| `src/editor/components/notion/`     | Main editor shell, provider wiring, header, content area, setup/error states, theme toggle, and TOC sidebar.                                                    |
| `src/editor/components/ui/`         | Editor-specific UI widgets such as toolbars, slash/mention/emoji menus, link popovers, color controls, image controls, and block actions.                       |
| `src/editor/components/table/`      | Table handles, overlays, context menus, and row/column extension controls.                                                                                      |
| `src/editor/components/primitives/` | Reusable UI primitives: buttons, menus, popovers, cards, avatars, inputs, toolbars, separators, and tooltips.                                                   |
| `src/editor/composables/`           | Vue composables for editor state, collaboration, AI token flow, TOC, selection, floating menus, colors, links, table handles, node movement, and user identity. |
| `src/editor/extensions/`            | Tiptap/ProseMirror behavior extensions including indentation, node alignment/background, table handles, list normalization, UI state, and block selection.      |
| `src/editor/nodes/`                 | Custom Vue NodeViews and Tiptap nodes for images, image uploads, and table of contents blocks.                                                                  |
| `src/editor/content/`               | Default document content used by the demo/editor initialization.                                                                                                |
| `src/editor/utils/`                 | Shared helpers for document ids, suggestions, table operations, throttling, node actions, TOC utilities, trigger handling, and user persistence.                |
| `src/editor/icons/`                 | Icon exports used by editor UI components.                                                                                                                      |
| `src/editor/styles/`                | Global editor CSS, node styles, UI primitive styles, table styles, and design tokens.                                                                           |

## Tinyfy Embedding Notes

### Local Integration with the Tinyfy Cabinet

Use one of these workflows when developing the cabinet and editor together:

- **Packed local tarballs** validate the same `dist`-based package boundary that a consumer receives. Use this workflow before accepting a release-boundary change.
- **Vite source aliases** point the cabinet directly at this checkout's source files. Use them for faster editor-source iteration, then return to the tarball workflow for packed-artifact validation.

Both workflows use the same integration surface:

```ts
import { NotionEditor } from '@i-prikot/editor'
import '@i-prikot/editor/style.css'
```

Install or resolve `@i-prikot/editor-schema` whenever the cabinet or the editor dependency graph requires it. The detailed tarball and source-alias procedures follow in this section.

### Component Integration

The package entry point maps to the following editor flow:

1. `src/main.ts` imports global CSS and mounts the Vue app.
2. `src/App.vue` calls `getDocumentId()` and passes the result as `room`.
3. `src/editor/components/notion/NotionEditor.vue` provides user, collaboration, AI, and TOC contexts, then renders `NotionEditorContent`.
4. `NotionEditorContent` and `EditorProvider` create the Tiptap editor instance and compose the header, content area, floating UI, table UI, and sidebars.

`NotionEditor` is the main cabinet integration boundary. It currently accepts:

- `room?: string` — document/collaboration room id.
- `placeholder?: string` — editor placeholder text, defaulting to `Start writing...`.

The cabinet must provide compatible `vue` and `@tiptap/*` runtime versions. Incompatible or duplicated copies can create separate editor or ProseMirror instances.

### Localization

The editor ships complete bundled catalogs such as `en` and `ru`; the English catalog in
`packages/editor/src/i18n/en/` defines the canonical message keys and nested shape. This is
separate from the host-facing `messages` option: hosts may use any locale identifier and provide
only partial overrides for that locale.

```ts
import {
  en,
  type EditorMessageCatalog,
  type EditorMessageOverrides,
  type EditorMessageTree,
} from '@i-prikot/editor'

const britishEnglish: EditorMessageOverrides = {
  editor: { placeholder: 'Start typing...' },
}

const hostMessages: EditorMessageCatalog = {
  'en-GB': britishEnglish,
}

const bundledBase: EditorMessageTree = en
```

To add a language that ships with the editor:

1. Create `packages/editor/src/i18n/<locale>/` with the same namespace file layout as `en/`.
2. Translate every English leaf. Keep literal inference and check every namespace against the
   canonical tree, for example `export const common = { ... } as const satisfies
EditorMessageTree['common']`; the locale `index.ts` must use `as const satisfies
EditorMessageTree`.
3. When the catalog is intended to ship, export it from `packages/editor/src/i18n/index.ts` and
   `packages/editor/src/index.ts` alongside the existing bundled catalogs.
4. Run `npm run validate:locales` and `npm run typecheck` before opening the pull request.

Bundled locales never silently fall back to English. Missing, blank, malformed, or extra keys are
CI failures. The validator reports only locale identifiers, key paths, and failure reasons; it
never prints translation text or host-supplied catalogs.

### Packed Local Tarballs

Use local tarballs to validate the production package boundary. This exercises the built `dist` artifacts rather than resolving workspace source files.

From this editor checkout, install dependencies, build every workspace package, then pack the schema **before** the editor:

```bash
npm install
npm run build
npm pack --workspace=@i-prikot/editor-schema
npm pack --workspace=@i-prikot/editor

# Only when the cabinet uses static rendering:
npm pack --workspace=@i-prikot/editor-renderer
```

Each `npm pack` command prints the generated `.tgz` path. Keep those paths and install them in the cabinet in the same order, replacing each placeholder with the path printed on your machine:

```bash
# Run in the Tinyfy cabinet checkout.
npm install <path-to-editor-schema-tarball>.tgz
npm install <path-to-editor-tarball>.tgz

# Only when the cabinet uses static rendering:
npm install <path-to-renderer-tarball>.tgz
```

The installed editor must resolve the normal imports:

```ts
import { NotionEditor } from '@i-prikot/editor'
import '@i-prikot/editor/style.css'
```

Before treating the installation as valid, check the following:

- `node_modules/@i-prikot/editor` and `node_modules/@i-prikot/editor-schema` are extracted package archives, not symlinks to this workspace.
- The editor package contains its built `dist` files, including the JavaScript entry point, declarations, and stylesheet.
- The cabinet resolves compatible versions of `vue` and the required `@tiptap/*` packages; incompatible peer runtimes can duplicate editor or ProseMirror instances.
- No generated `.tgz` archive is staged or committed in either repository.

After any package change, repeat the loop: run `npm run build`, pack the schema and editor again, reinstall the new tarballs in the cabinet, then restart its Vite dev server if dependency pre-bundling prevents the update from appearing. A tarball install verifies the consumer boundary; do not replace it with a workspace link or a source alias when checking a release-boundary change.

### Vite Source Aliases

For rapid source-level iteration, the cabinet can alias package imports to this checkout. The alias array and filesystem-access shape mirror the known-good pattern in `apps/playground/vite.config.ts`.

In the cabinet's `vite.config.ts`, replace the path placeholder with the root of your local editor checkout. Do not commit a machine-specific path:

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const editorCheckoutRoot = '<path-to-local-tinyfy-editor-checkout>'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@i-prikot/editor/style.css',
        replacement: resolve(editorCheckoutRoot, 'packages/editor/src/styles.css'),
      },
      {
        find: '@i-prikot/editor-schema',
        replacement: resolve(editorCheckoutRoot, 'packages/schema/src/index.ts'),
      },
      {
        find: '@i-prikot/editor',
        replacement: resolve(editorCheckoutRoot, 'packages/editor/src/index.ts'),
      },
    ],
  },
  server: {
    fs: {
      allow: [editorCheckoutRoot],
    },
  },
})
```

`server.fs.allow` is required when the cabinet repository is outside this workspace; without it Vite rejects imports from the editor checkout. These aliases intentionally bypass packed `dist` artifacts. Remove them before production packaging, and ensure the cabinet and editor share compatible `vue` and `@tiptap/*` runtimes so Vite does not load duplicate editor or ProseMirror instances.

To verify the alias workflow, start the cabinet dev server, edit an editor source or style file in this checkout, and confirm that the cabinet receives hot reload. If Vite does not apply the change, restart the cabinet dev server and confirm the updated file is still resolved through the alias. Return to the packed-tarball workflow before accepting any release-boundary change.

## Development Notes

- Collaboration is optional and controlled by environment variables plus the `?noCollab=1` URL override.
- Static JWT variables are intended only for local development because Vite embeds `VITE_` values into the frontend bundle.
- The AI token context mirrors the original template's flow, but the paid Tiptap AI extension itself is not included in this port.
- There is no client router; the document id is the final URL path segment or `default`.
