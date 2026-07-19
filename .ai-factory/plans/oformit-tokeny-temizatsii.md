<!-- handoff:task:308d02a3-040d-4c8a-9227-5473a293505b -->
# Implementation Plan: Оформить токены темизации

Branch: `main`
Created: 2026-07-17

## Goal

Make CSS custom properties defined by `@i-prikot/editor` a stable, consumer-facing
theming contract. Consumers must be able to find the supported variables, know
where and how to override them for light and dark editor instances, and avoid
depending on implementation-only aliases.

## Settings

- [x] Testing: no
- [x] Logging: verbose
- [x] Docs: no — no general documentation checkpoint; the package-level theming
  reference below is required by this feature itself.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; this focused public-contract
task supports the existing editor CSS packaging work without changing the
roadmap artifact.

## Constraints

- [x] Keep `packages/editor/src/styles/design-tokens.css` as the single source of
  truth for token defaults and light/dark overrides; do not introduce a
  JavaScript theming API or duplicate token values elsewhere.
- [x] Preserve the canonical stylesheet entry and CSS export selected by
  `.ai-factory/plans/sobrat-edinyy-css-redaktora.md`; this plan documents the
  variable API and must not rename CSS subpaths or restructure the CSS bundle.
- [x] Publicly support only the documented `--tt-*` groups. Treat the unprefixed
  implementation aliases `--white`, `--black`, and `--transparent` as private
  and exclude them from consumer guidance.
- [x] Preserve rendered defaults, `.tinyfy-editor.dark` behavior, selector scope,
  and existing token names. Any future incompatible rename requires a package
  breaking-change process rather than a silent replacement.
- [x] Do not add or run automated tests. Use build, package-content, and manual
  browser checks as verification evidence.

## Tasks

### Phase 1: Define the supported CSS-variable surface

- [x] **Task 1: Classify and annotate the stable `@i-prikot/editor` token contract.**
  - [x] Files: `packages/editor/src/styles/design-tokens.css`.
  - [x] Add a concise, source-of-truth contract header that identifies the
    `.tinyfy-editor` scope, the `.tinyfy-editor.dark` override scope, cascade
    order requirement (consumer CSS loads after the editor stylesheet), and
    the promise that documented names are safe to override.
  - [x] Explicitly enumerate the supported variable families, including every
    valid suffix/value set: core surfaces (`--tt-bg-color`, border/sidebar/
    scrollbar/cursor/selection/card tokens); neutral light/dark and alpha
    scales (`--tt-gray-{light,dark}{,-a}-{50,100,...,900}`); brand scale
    (`--tt-brand-color-{50,100,...,900,950}`); status scales
    (`--tt-color-{green,yellow,red}-{inc-5,...,inc-1,base,dec-1,...,dec-5}`);
    semantic text and highlight colors with their `-contrast` variants;
    `--tt-shadow-elevated-md`; `--tt-radius-{xxs,xs,sm,md,lg,xl}`;
    transition duration/easing tokens; and the three contrast percentage
    tokens (`--tt-{accent,destructive,foreground}-contrast`).
  - [x] Clearly mark non-`--tt-*` aliases as internal implementation details
    and retain their current values/uses; do not claim they are part of the
    supported API.
  - [x] Keep comments and declarations grouped by category so additions can be
    reviewed against the public/private boundary without changing cascade or
    visual output.
  - [x] **Logging:** record verbose implementation notes for each public group,
    every excluded alias, and any declaration whose category was clarified. Do
    not add runtime or browser `console` logging for this stylesheet-only work.

### Phase 2: Publish usable consumer guidance with the package

- [x] **Task 2: Add a package-level theming reference that mirrors the source contract.** (depends on Task 1)
  - [x] Files: `packages/editor/README.md`; `packages/editor/package.json` only
    if package-content verification shows the README is not included by the
    published package.
  - [x] Document the supported token families from Task 1 as an exact list or
    exact expandable-name patterns; do not replace the list with vague claims
    such as "all colors are configurable".
  - [x] Provide minimal light and dark override examples targeting
    `.tinyfy-editor` and `.tinyfy-editor.dark`, loaded after the package CSS
    export. Demonstrate overriding semantic variables rather than private
    aliases, and state that per-editor overrides should remain scoped to the
    editor root.
  - [x] State compatibility expectations: documented `--tt-*` names are the
    public API, additions are non-breaking, and removals/renames require a
    versioned breaking-change path. Link the reference to the repository source
    for `packages/editor/src/styles/design-tokens.css` as the source of default
    values.
  - [x] Keep this focused on theming; do not add unrelated editor setup,
    playground, or general API documentation.
  - [x] **Logging:** capture verbose notes for the package-file list and the
    exact consumer examples checked. Do not add application logging.

### Phase 3: Verify the delivered contract without automated tests

- [x] **Task 3: Build, pack, and manually validate theme overrides.** (depends on Tasks 1–2)
  - [x] Files inspected/generated: `packages/editor/dist/` CSS artifact named
    by `packages/editor/package.json` exports, plus the package tarball file
    list from `npm pack --workspace=@i-prikot/editor --dry-run`.
  - [x] Run `npm run build --workspace=@i-prikot/editor`; confirm the public CSS
    export still bundles the annotated defaults and dark-mode overrides without
    changing its configured subpath.
  - [x] Use `npm pack --workspace=@i-prikot/editor --dry-run` to confirm the
    package-level theming reference is shipped to consumers; if it is absent,
    make the smallest package `files` adjustment required and repeat the
    inspection.
  - [x] In the playground or an equivalent local consumer stylesheet, override
    representative surface, brand, text, highlight, radius, and shadow tokens
    for both `.tinyfy-editor` and `.tinyfy-editor.dark`. Confirm the overrides
    affect only that editor root and preserve menus, selected text, and card
    contrast.
    - Manual validation recorded 2026-07-18: an isolated Chromium consumer page
      loaded `packages/editor/dist/styles.css` before scoped light/dark consumer
      overrides. It verified surface, border, brand, text, highlight, radius,
      shadow, menu, selected-text, and card styles on both roots; the host
      sibling remained unstyled. Text/highlight, text/card, and menu contrast
      ratios were respectively at least 7.17:1, 10.22:1, and 7.25:1.
  - [x] Do not create or execute unit, snapshot, or browser test suites. Report
    the build result, package-content result, and manual light/dark inspection
    as the required verification evidence.
  - [x] **Logging:** retain verbose command output, generated-CSS search
    results, tarball file-list results, and manual override observations in the
    implementation handoff. No permanent production logs are required.

## Completion Criteria

- [x] `packages/editor/src/styles/design-tokens.css` explicitly distinguishes
  supported `--tt-*` tokens from private aliases without changing default
  rendering or dark-mode cascade.
- [x] Consumers have a shipped `packages/editor/README.md` reference with an
  exact supported-variable inventory, scoped light/dark override examples, and
  compatibility rules.
- [x] The configured `@i-prikot/editor` CSS export continues to contain token
  defaults and `.tinyfy-editor.dark` overrides after `npm run build
  --workspace=@i-prikot/editor`.
- [x] `npm pack --workspace=@i-prikot/editor --dry-run` includes the theming
  reference, and manual scoped overrides work in both color modes.
- [x] No automated tests, unrelated package exports, CSS scoping behavior, or
  non-editor documentation artifacts are added or changed.
