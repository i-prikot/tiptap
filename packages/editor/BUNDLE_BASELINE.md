# Editor Bundle Baseline

Captured on **2026-07-22** for `@i-prikot/editor`. This is a delivery-size and
bundle-composition reference point only; it does not change the package's
runtime behavior or optimize its output.

## Reproduce

From the repository root, run:

```sh
npm run analyze --workspace=@i-prikot/editor
```

The command first removes stale CSS, emits declarations, then runs the Vite
library build in `bundle-analysis` mode. It writes untracked reports to:

- `packages/editor/.bundle-analysis/treemap.html` — interactive treemap
- `packages/editor/.bundle-analysis/raw-data.json` — machine-readable data

The normal library build remains:

```sh
npm run build --workspace=@i-prikot/editor
```

## Toolchain

| Tool                     | Version    |
| ------------------------ | ---------- |
| Node.js                  | `v22.23.1` |
| npm                      | `10.9.8`   |
| Vite                     | `6.4.3`    |
| Rollup                   | `4.62.2`   |
| rollup-plugin-visualizer | `7.0.1`    |

## Publishable Payload

Only `dist/index.js` and `dist/styles.css` are measured below. Declaration
files and source maps are intentionally excluded.

| Artifact          |     Raw bytes |    Gzip bytes | Brotli bytes |
| ----------------- | ------------: | ------------: | -----------: |
| `dist/index.js`   |       436,339 |       100,277 |       79,866 |
| `dist/styles.css` |     1,596,673 |       962,987 |      828,292 |
| **Combined**      | **2,033,012** | **1,063,264** |  **908,158** |

Measurements use Node.js `node:zlib`, matching visualizer compression settings:
gzip compression level 9, and Brotli text mode at maximum quality with the
input size as its hint. Vite's console reporter uses its own gzip settings, so its displayed values are not used for this baseline.

**Observation:** CSS accounts for 1,596,673 raw bytes (about 78.5% of the
combined raw payload). This baseline records that fact only; no optimization
is included in this change.

## Visualizer Composition

The raw-data report contains one JavaScript output chunk, `index.js`; Vite
emits `styles.css` separately as the library CSS asset. The largest bundled
source groups reported by the visualizer are:

| Source group      | Module parts | Raw bytes | Gzip bytes | Brotli bytes |
| ----------------- | -----------: | --------: | ---------: | -----------: |
| `src/components`  |           96 |   265,425 |     80,223 |       69,563 |
| `src/icons`       |            1 |   121,677 |     30,174 |       23,826 |
| `src/composables` |           49 |   101,085 |     33,080 |       28,366 |
| `src/utils`       |           19 |    53,642 |     16,152 |       13,893 |
| `src/nodes`       |            6 |    23,423 |      7,094 |        6,103 |

The largest individual bundled module is `src/icons/index.ts` at 121,677 raw
bytes (30,174 gzip; 23,826 Brotli). Other large reported modules include
`MobileToolbarMain.vue` (19,267 raw bytes), `DragContextMenu.vue` (12,624),
and `ImageUploadNodeView.vue` (11,941).

## External Boundaries

The Rollup external matcher intentionally excludes these dependency groups from
bundle bytes:

- Host/runtime: `vue` and all `@tiptap/*` modules, including `@tiptap/pm/*`
- Workspace schema: `@i-prikot/editor-schema`
- Floating UI: `@floating-ui/*`
- Collaboration: `@hocuspocus/*`, `y-prosemirror`, `y-protocols`, and `yjs`
- Math rendering: `katex`

The generated raw-data report confirms the imports present in this build as
external: `vue`, the used `@tiptap/*` and `@tiptap/pm/*` modules,
`@i-prikot/editor-schema`, `@floating-ui/dom`, `@floating-ui/vue`,
`@hocuspocus/provider`, and `yjs`. These modules contribute no bundled source
bytes in `index.js`; entries configured as external but not imported by the
current source do not appear in the report.
