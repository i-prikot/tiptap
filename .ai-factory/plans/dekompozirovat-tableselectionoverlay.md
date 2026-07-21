<!-- handoff:task:e0c2bb39-1b3f-4a32-9776-c08c265e615f -->
# Декомпозировать TableSelectionOverlay

**Mode:** fast  
**Branch:** `main`  
**Created:** July 20, 2026  
**Task type:** Vue 3 UI refactor

## Goal

Разделить `TableSelectionOverlay.vue` на компонент-оркестратор, composable для вычисления состояния рамки выделения таблицы и общий hook для циклов `requestAnimationFrame`, не меняя визуальное поведение, команды ресайза или публичный контракт компонента. Все отложенные animation-frame операции должны останавливаться при окончании ресайза, смене экземпляра редактора и размонтировании компонента.

## Settings

- [ ] **Testing:** no — по явному ограничению задачи; не добавлять и не запускать тесты.
- [ ] **Logging:** verbose local diagnostics; не добавлять runtime-логи в UI или в каждый rAF-кадр для чистого рефакторинга.
- [ ] **Docs:** no — не изменять документацию.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** автономный Handoff fast-mode не запрашивает привязку; задача реализует существующий пункт декомпозиции `TableSelectionOverlay.vue` в Этапе 6 файла `.ai-factory/ROADMAP.md`.

## Scope and Decisions

- [ ] Сохранить текущий публичный API `<TableSelectionOverlay :show-resize-handles="…" />`, Teleport в `.table-selection-overlay-container`, Floating UI positioning, четыре resize-corner и события `menuOpenChange` без изменений.
- [ ] Вынести из SFC geometry-логику: union-rect для `CellSelection`, fallback к anchor-cell, очистку rect/visibility при отсутствии DOM-ячеек, поиск DOM-таблицы через `getTable`, а также обновление только при отличающемся `rectEq` результате.
- [ ] Новый общий rAF hook не должен зависеть от Tiptap или таблиц: он принимает frame-callback, защищает от повторного запуска, предоставляет явную остановку и отменяет pending frame через Vue lifecycle cleanup.
- [ ] Сохранить существующие типы transaction metadata и подписки на `selectionUpdate`/`transaction`; компонент продолжает отвечать только за wiring editor events, Floating UI и resize interaction.
- [ ] Не менять CSS, table utilities, Tiptap-команды, зависимости, exports за пределами composable barrel и уже существующие integration tests.

## Tasks

### Phase 1 — Extract table-selection geometry

- [x] **1. Add a typed table-selection geometry composable.**  
  **Files:** create `packages/editor/src/composables/useTableSelectionRect.ts`; modify `packages/editor/src/composables/index.ts`.  
  Accept the injected Tiptap editor ref and expose reactive `visible`, `selectionRect`, and `tableDom` state plus a single refresh method for overlay consumers. Move `computeSelectionRect` and `updateTableDom` into this composable while preserving all current branches: collect selected cell DOM nodes and calculate their union bounds for `CellSelection`; use `cellAround(selection.$anchor)` for the one-cell case; create a fresh `DOMRect`; update the stored rect only when `rectEq` detects a change; hide and clear stale geometry when neither a selected cell nor a DOM node exists. Resolve the selected table using `getTable` and the editor view exactly as before so the Teleport target remains stable. Export the composable from the existing barrel without adding a public editor API.  
  **Expected behavior:** a consumer can refresh table-selection state after an editor event and receive the same rect, visibility, and table DOM values currently used by the overlay.  
  **Dependencies:** none.  
  **Logging:** add no runtime logs; retain verbose local diff/type diagnostics only, because geometry may refresh on every transaction.

### Phase 2 — Extract reusable animation-frame lifecycle

- [x] **2. Add a reusable self-scheduling rAF loop hook.**  
  **Files:** create `packages/editor/src/composables/useRafLoop.ts`; modify `packages/editor/src/composables/index.ts`.  
  Implement a framework-scoped hook with a typed frame callback whose result determines whether another frame is scheduled. Return idempotent `start` and `stop` operations (and running state only if it makes the API clearer). `start` must never create parallel loops; `stop` must cancel the pending browser animation frame and clear its identifier; the next callback must not reschedule after a stop; and lifecycle disposal must call `stop` so a callback cannot outlive the consuming component. Keep the hook domain-agnostic—no editor, table, DOM-selection, or column-resize imports.  
  **Expected behavior:** a consumer can start a polling loop once, continue it while the callback requests another frame, stop it explicitly, and rely on automatic cancellation during unmount.  
  **Dependencies:** none.  
  **Logging:** add no runtime logs; preserve verbose local lifecycle diagnostics through code inspection and static-check output, avoiding per-frame console noise.

### Phase 3 — Recompose the overlay around the extracted units

- [x] **3. Refactor `TableSelectionOverlay.vue` into orchestration and interaction only.**  
  **Files:** modify `packages/editor/src/components/table/TableSelectionOverlay.vue`.  
  Replace local `visible`, `selectionRect`, `tableDom`, `computeSelectionRect`, and `updateTableDom` with `useTableSelectionRect(editor)`, keeping template bindings and Floating UI’s virtual reference/watch behavior unchanged. Replace local `rafId`, `trackColumnResize`, and `stopResizeTracking` with `useRafLoop`: on each frame refresh selection geometry, read `columnResizingPluginKey` from the current editor state, and request another frame only while the resize plugin reports `dragging`; retain the final refresh when resize metadata ends. Keep a single cleanup path for editor event subscriptions, explicitly stop the rAF loop when the editor instance changes or the transaction ends, and rely on the hook’s unmount cleanup as the final safeguard. Do not alter corner drag calculations, `TableCellHandleMenu` events, transaction-meta narrowing, or component props/emits.  
  **Expected behavior:** selection outlines, single-cell fallback, overlay teleport placement, corner resizing, and grip-menu behavior remain unchanged; no animation frame continues after dragging ends, editor replacement, or component unmount.  
  **Dependencies:** Tasks 1–2.  
  **Logging:** add no runtime logs; inspect verbose local behavior/diff diagnostics and keep the high-frequency resize path silent.

### Phase 4 — Perform non-test static validation

- [x] **4. Validate extraction boundaries and cleanup behavior without tests.**  
  **Files:** `packages/editor/src/components/table/TableSelectionOverlay.vue`, `packages/editor/src/composables/useTableSelectionRect.ts`, `packages/editor/src/composables/useRafLoop.ts`, `packages/editor/src/composables/index.ts` (read-only validation); inspect `packages/editor/src/components/notion/EditorProvider.vue` for unchanged consumer wiring.  
  Run `npm run typecheck` and `npm run lint`. Review the final diff and manually trace three states in the code: a multi-cell `CellSelection`, an anchor-cell selection, and a no-cell selection. Also trace resize start, continued dragging, resize stop, editor replacement, and component unmount to confirm there is exactly one active rAF loop at most and that pending frames are cancelled. Do not add, alter, or run automated tests; do not change documentation.  
  **Expected behavior:** TypeScript and lint checks pass, the sole overlay consumer needs no API change, and the refactor introduces no new background-operation leak.  
  **Dependencies:** Task 3.  
  **Logging:** retain verbose command output and manual-inspection notes as local diagnostics only; add no production logging.

## Acceptance Criteria

- [ ] `TableSelectionOverlay.vue` no longer owns table selection-rect or table-DOM calculation logic.
- [ ] `useTableSelectionRect` preserves current multi-cell union bounds, anchor-cell fallback, stale-rect clearing, visibility, and table-container lookup behavior.
- [ ] `useRafLoop` is reusable outside tables, prevents duplicate loops, stops explicitly, and cancels its pending frame automatically on component disposal.
- [ ] Column-resize tracking refreshes the overlay while `columnResizingPluginKey` is dragging and stops immediately when dragging ends or editor wiring is replaced.
- [ ] The overlay’s props, emits, Teleport target, Floating UI placement, resize corners, menu interaction, styles, and editor event semantics remain unchanged.
- [ ] `npm run typecheck` and `npm run lint` pass; no tests or documentation changes are added.

## Out of Scope

- [ ] Adding, changing, or running automated tests.
- [ ] Changing `EditorProvider.vue` or the overlay’s external API beyond compatibility inspection.
- [ ] Refactoring corner-resize selection math, column-resize plugin behavior, Floating UI settings, table styles, utilities, or Tiptap extensions.
- [ ] Adding production logging, dependencies, documentation, or unrelated component changes.
