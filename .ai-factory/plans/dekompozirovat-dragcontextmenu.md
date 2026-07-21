<!-- handoff:task:a10488d7-ef93-4ad6-b56c-402e40268cd9 -->
# Декомпозировать DragContextMenu

**Mode:** fast  
**Branch:** `main`  
**Created:** July 20, 2026  
**Task type:** Vue 3 UI refactor

## Goal

Разделить `DragContextMenu.vue` на компоненты с узкой ответственностью и перенести подготовку моделей пунктов меню в composable, не меняя поведение drag-handle и доступные команды редактора.

## Settings

- [ ] **Testing:** no — по явному ограничению задачи; не добавлять и не запускать тесты.
- [ ] **Logging:** verbose local diagnostics; не добавлять runtime-логи в UI для чистого рефакторинга.
- [ ] **Docs:** no — не изменять документацию.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** автономный Handoff fast-mode не запрашивает привязку; задача соответствует существующему пункту декомпозиции в `.ai-factory/ROADMAP.md`.

## Scope and Decisions

- [ ] `ColorMenu.vue` и `TableAlignMenu.vue` уже являются отдельными переиспользуемыми подменю и используются также в табличных меню и мобильном тулбаре. Не создавать их копии, не переносить и не менять их публичный контракт без необходимости.
- [ ] Вынести только отсутствующую оболочку вложенного `Turn Into` в локальный компонент `DragContextMenuTurnInto.vue`; он получает подготовленные `TurnIntoMenuItem[]` и остаётся привязанным к семантике `Menu`/`MenuContent`, а не `DropdownMenu`.
- [x] Создать `useDragContextMenuItems.ts` для создания и реактивной подготовки conversion-, node-specific-, clipboard- и destructive-пунктов. Использовать существующие action/conversion composables и типы меню; не дублировать команды Tiptap.
- [ ] Оставить в `DragContextMenu.vue` только lifecycle и состояние drag-handle: текущий узел/позицию, lock handle при открытии меню, позиционирование, visibility, drag start/end и закрытие меню.

## Rework

- [x] **2026-07-20 — Address review finding `d2614aee2005`.** Preserve explicit pre- and post-submenu node-action collections so filtering unavailable actions cannot move `Reset formatting` ahead of `Turn Into`, `Color`, and `Alignment`.

## Tasks

### Phase 1 — Extract menu-item preparation

- [x] **1. Add a typed `useDragContextMenuItems` composable.**  
  **Files:** create `packages/editor/src/composables/useDragContextMenuItems.ts`; modify `packages/editor/src/composables/index.ts`.  
  Instantiate the existing block-conversion and node-action composables against the injected editor ref, then expose computed item collections for: node-specific actions (`Show title`, table fit/clear, reset formatting, image download), `Turn Into`, clipboard/duplicate actions with formatted shortcuts, and the destructive delete action. Preserve the current visibility rules: hide unavailable node-specific actions, retain disabled state for duplicate/copy/anchor/delete, and hide the complete `Turn Into` submenu only when every conversion is unavailable. Keep icon, label, handler, active state, disabled state, ordering, and `inlineThread` exclusion unchanged. Reuse existing `TurnIntoMenuItem`/`EditorMenuActionItem` shapes or define an internal extension only when shortcut/active metadata requires it; do not add a public editor API.  
  **Expected behavior:** all menu item state remains reactive to editor selection and capability changes while `DragContextMenu.vue` no longer builds action objects or owns action composables.  
  **Dependencies:** none.  
  **Logging:** add no application logging; retain verbose local typecheck/lint diagnostics while implementing.

### Phase 2 — Extract the missing nested submenu

- [x] **2. Create the dedicated `Turn Into` submenu component.**  
  **Files:** create `packages/editor/src/components/ui/DragContextMenuTurnInto.vue`.  
  Move the nested `Menu` markup currently embedded in `DragContextMenu.vue` into a presentation component accepting the prepared `TurnIntoMenuItem[]`. Preserve the right placement, trigger icon/text, submenu-trigger behavior, label, item keys, disabled and active attributes, and `@select` handlers so the primitive menu continues to close the full menu chain only after selecting a final item. Render nothing when the items array is empty. Keep this component scoped to the drag context menu; do not replace the separate `TurnIntoDropdown`/`TurnIntoDropdownContent` flow, which uses dropdown primitives.  
  **Expected behavior:** the conversion submenu has identical keyboard/pointer and close-chain behavior but has no editor/action-composable knowledge.  
  **Dependencies:** Task 1.  
  **Logging:** add no application logging; use verbose local Vue/TypeScript diagnostics only.

### Phase 3 — Simplify the drag-menu coordinator

- [x] **3. Rewire `DragContextMenu` to use the extracted pieces.**  
  **Files:** modify `packages/editor/src/components/ui/DragContextMenu.vue`; consume `packages/editor/src/composables/useDragContextMenuItems.ts` and `packages/editor/src/components/ui/DragContextMenuTurnInto.vue`; retain `packages/editor/src/components/ui/ColorMenu.vue` and `packages/editor/src/components/ui/TableAlignMenu.vue` as existing submenus.  
  Replace inline conversion markup and direct action-composable setup with the composable’s item collections, rendering each existing group in the current order with the same separators, disabled styling, active state, and shortcut badges. Keep `ColorMenu` and `TableAlignMenu` as their current direct child components; verify they still resolve the injected editor context. Remove only imports, computed values, and helpers made obsolete by the extraction. Do not change `DragContextMenu` props, `EditorContentArea.vue` integration, drag-handle position configuration, selection/mobile/AI visibility logic, node selection on grip press, drag lock metadata, or focus restoration after a drag.  
  **Expected behavior:** consumers continue to mount `<DragContextMenu :ai-enabled="…" />` unchanged, while its SFC is limited to orchestration and the rendered menu exposes exactly the previous actions in their prior conditions.  
  **Dependencies:** Tasks 1–2.  
  **Logging:** add no runtime logs; inspect verbose local diff and static-check output for behavior-preserving diagnostics.

### Phase 4 — Perform non-test static validation

- [x] **4. Validate the refactor and its integration boundaries.**  
  **Files:** `packages/editor/src/components/ui/DragContextMenu.vue`, `packages/editor/src/components/ui/DragContextMenuTurnInto.vue`, `packages/editor/src/composables/useDragContextMenuItems.ts`, `packages/editor/src/composables/index.ts` (read-only validation); inspect `packages/editor/src/components/notion/EditorContentArea.vue`, `packages/editor/src/components/table/TableCellHandleMenu.vue`, `packages/editor/src/components/table/TableHandleMenuContent.vue`, and `packages/editor/src/components/ui/MobileToolbar.vue` for unchanged shared-submenu consumers.  
  Run the editor workspace’s non-test static checks: `npm run typecheck --workspace=@i-prikot/editor` and `npm run lint --workspace=@i-prikot/editor`. Review the diff to confirm the refactor does not modify `ColorMenu.vue`, `TableAlignMenu.vue`, dropdown turn-into components, public exports, docs, dependencies, or unrelated menu consumers. Manually inspect the three logical menu states represented by the code: a convertible text block, a table cell, and an image/TOC node, confirming retained conditions and command wiring.  
  **Expected behavior:** Vue/TypeScript and lint validation complete cleanly, shared submenu consumers remain compatible, and no tests or documentation changes are introduced.  
  **Dependencies:** Task 3.  
  **Logging:** preserve verbose command output and inspection notes as local diagnostics only; add no production logging.

## Acceptance Criteria

- [ ] `DragContextMenu.vue` retains its current public props and drag-handle lifecycle while no longer constructs conversion or node-action item models inline.
- [ ] `useDragContextMenuItems` owns reactive preparation of all existing action groups, including active/disabled/visibility state and shortcut labels.
- [ ] `DragContextMenuTurnInto.vue` renders the nested conversion menu with the same placement, trigger, selection, disabled, active, and close-chain semantics.
- [ ] Existing `ColorMenu.vue` and `TableAlignMenu.vue` remain the single shared implementations and continue to work for their table and mobile consumers.
- [ ] Menu action order and conditions remain unchanged for TOC, table, image, and ordinary text-block contexts.
- [ ] `npm run typecheck --workspace=@i-prikot/editor` and `npm run lint --workspace=@i-prikot/editor` pass; no tests or documentation changes are added.

## Out of Scope

- [ ] Adding, changing, or running automated tests.
- [ ] Changing `MobileToolbar.vue`, table-handle menus, `TurnIntoDropdown.vue`, or `TurnIntoDropdownContent.vue` beyond compatibility inspection.
- [ ] Moving or duplicating the already shared `ColorMenu.vue` and `TableAlignMenu.vue` implementations.
- [ ] Altering Tiptap commands, menu primitive behavior, editor public API, styles, dependencies, or documentation.
