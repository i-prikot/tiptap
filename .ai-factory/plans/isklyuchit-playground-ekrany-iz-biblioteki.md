<!-- handoff:task:65f36592-d223-49f0-a469-301c1bf4358f -->
# Implementation Plan: Исключить playground-экраны из библиотеки

Branch: `main`
Created: 2026-07-17
Mode: fast (Autonomous Handoff)

## Goal

Исключить из поставляемого `@i-prikot/editor` все визуальные поверхности,
которые относятся к демонстрационному приложению, а не к переиспользуемому
редактору. В частности, убрать библиотечный экран `SetupError` и его CSS,
сохранив работоспособный fallback при ошибке конфигурации облачных сервисов.
CTA-попап остаётся только в `apps/playground`, где он уже расположен вместе со
своими стилями и импортируется точкой входа demo-приложения.

## Settings

- [ ] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [ ] Logging: verbose implementation diagnostics; retain only redacted error diagnostics for failed cloud-token retrieval and never log tokens or configuration secrets.
- [ ] Docs: no — do not add documentation tasks or a documentation checkpoint.

## Constraints

- [ ] Keep `@i-prikot/editor` independent of `apps/playground`; the editor package must not import app components, styles, or environment-specific code.
- [ ] Preserve the existing public editor facade and package export map; do not export the removed screen or add playground-only entry points.
- [ ] A collaboration-token failure must fall back to the local editor rather than leaving the consumer on an indefinite loader; an AI-token failure must disable the unavailable AI path without blocking editor startup.
- [ ] Keep `CtaPopup.vue` and `cta-popup.css` under `apps/playground` only; do not copy either into the library.
- [ ] Do not modify tests or documentation, including despite the repository TDD rule, because this handoff explicitly disables test work.

## Tasks

### Phase 1: Remove the library-only setup screen safely

- [x] **Task 1: Replace setup-screen gating with non-visual cloud-service fallbacks.**
  - [x] Files: `packages/editor/src/composables/useCollab.ts`, `packages/editor/src/composables/useAi.ts`, `packages/editor/src/components/notion/NotionEditorContent.vue`.
  - [x] Remove `setupError` from the collaboration and AI context contracts and stop consuming it in `NotionEditorContent`.
  - [x] When collaboration token retrieval returns no token, set collaboration inactive so the existing local-history editor path can initialize; when AI token retrieval fails, set AI inactive so readiness is not blocked and unavailable AI UI remains disabled.
  - [x] Keep the loading gate only for cloud services that are still actively awaiting a provider/token; confirm rejected or empty token responses cannot leave `LoadingSpinner` rendered forever.
  - [x] **Logging:** preserve concise `ERROR` diagnostics at the failed token-fetch boundary, with service name and failure status only; never log token values, request credentials, or full configuration. Do not add presentation-layer logging.

- [x] **Task 2: Delete the setup-error presentation from the editor package and its stylesheet graph.** (depends on Task 1)
  - [x] Files: delete `packages/editor/src/components/notion/SetupError.vue`; delete `packages/editor/src/styles/setup-error.css`; update `packages/editor/src/components/notion/NotionEditorContent.vue` and `packages/editor/src/styles.css`.
  - [x] Remove the `SetupError` import, conditional template branch, derived error refs, and `@import './styles/setup-error.css'` reference.
  - [x] Verify no source file in `packages/editor/src` imports or references `SetupError`, `setup-error`, or `.tiptap-setup-error` after the deletion.
  - [x] **Logging:** no new runtime logs; this task only removes dead visual code after Task 1 transfers failure handling to composables.

### Phase 2: Preserve the playground boundary and validate artifacts

- [x] **Task 3: Keep CTA functionality and styles exclusively in the playground application.**
  - [x] Files inspected: `apps/playground/src/App.vue`, `apps/playground/src/components/CtaPopup.vue`, `apps/playground/src/main.ts`, `apps/playground/src/styles/cta-popup.css`, `packages/editor/src/index.ts`.
  - [x] Retain the existing `CtaPopup` mount in `App.vue` and the app-local `cta-popup.css` import in `main.ts`; do not add a CTA export or stylesheet import to `@i-prikot/editor`.
  - [x] Confirm the post-fallback demo does not need a replacement `SetupError` screen: cloud failures should exercise the editor package's local/AI-disabled fallback instead of reintroducing a demo-only dependency into the library.
  - [x] **Logging:** retain the CTA's current user-facing behavior without new logs; use verbose terminal inspection to record that no library-to-playground import edge exists.

- [x] **Task 4: Build both workspace packages and inspect the published editor output.** (depends on Tasks 1–3)
  - [x] Files inspected/generated: `packages/editor/dist/index.js`, `packages/editor/dist/styles.css`, generated editor chunks, `apps/playground/dist/**`.
  - [x] Run `npm run build --workspace=@i-prikot/editor` and inspect generated JavaScript/CSS for the absence of `SetupError`, `tiptap-setup-error`, CTA markup, and CTA stylesheet selectors.
  - [x] Run `npm run build --workspace=@i-prikot/playground` to confirm the demo still resolves the public `@i-prikot/editor` API and keeps CTA assets in its own output.
  - [x] Use source import searches to confirm `packages/editor` has no `apps/playground` dependency and `apps/playground` consumes editor code only through package exports.
  - [x] **Logging:** preserve verbose build output and artifact-search results as implementation evidence; no test command is required or added.

## Completion Criteria

- [x] `@i-prikot/editor` no longer ships `SetupError.vue`, `setup-error.css`, `.tiptap-setup-error` selectors, or a setup-error render branch.
- [x] Failed collaboration/AI token acquisition cannot trap the reusable editor in a loading state and does not expose secrets through diagnostics.
- [x] `CtaPopup.vue` and its stylesheet remain app-local in `apps/playground` and absent from the editor package build.
- [x] Editor and playground workspace builds succeed without adding tests, documentation changes, public playground exports, or cross-package imports.
