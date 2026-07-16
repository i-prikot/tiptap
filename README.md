# Tinyfy Tiptap Editor

Tinyfy Tiptap Editor is a Vue 3 + Vite + TypeScript implementation of a Notion-like rich text editor built on Tiptap v3. The project is intended to serve as an embeddable editor library/component for Tinyfy while still running today as a local Vite demo application.

The current editor includes rich text blocks, headings, lists, task lists, tables, image nodes, table of contents support, floating toolbars, slash commands, mention and emoji menus, light/dark theme switching, local editing mode, optional Tiptap Cloud collaboration, and an optional AI token flow placeholder.

> Current packaging note: this repository is not configured as a published npm library yet. Tinyfy integration should treat `src/editor/components/notion/NotionEditor.vue` as the main component boundary to extract or import, and add formal library exports/build settings separately if direct package consumption is required.

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

The current entry flow is:

1. `src/main.ts` imports global CSS and mounts the Vue app.
2. `src/App.vue` calls `getDocumentId()` and passes the result as `room`.
3. `src/editor/components/notion/NotionEditor.vue` provides user, collaboration, AI, and TOC contexts, then renders `NotionEditorContent`.
4. `NotionEditorContent` and `EditorProvider` create the Tiptap editor instance and compose the header, content area, floating UI, table UI, and sidebars.

For Tinyfy, `NotionEditor.vue` is the main integration boundary. It currently accepts:

- `room?: string` — document/collaboration room id.
- `placeholder?: string` — editor placeholder text, defaulting to `Start writing...`.

Because the repository currently runs as a Vite app/demo, a production Tinyfy embedding pass should decide how to expose the editor component, styles, and peer dependencies. Possible follow-up work includes adding a library-mode Vite build, explicit exports, package metadata for distribution, and integration tests in the consuming Tinyfy app.

## Development Notes

- Collaboration is optional and controlled by environment variables plus the `?noCollab=1` URL override.
- Static JWT variables are intended only for local development because Vite embeds `VITE_` values into the frontend bundle.
- The AI token context mirrors the original template's flow, but the paid Tiptap AI extension itself is not included in this port.
- There is no client router; the document id is the final URL path segment or `default`.
