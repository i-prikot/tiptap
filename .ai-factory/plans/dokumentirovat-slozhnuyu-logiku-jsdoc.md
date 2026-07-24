<!-- handoff:task:b64c4980-e54c-4b11-8a6d-39e62f436645 -->
# Implementation Plan: Документировать сложную логику JSDoc

Branch: `main`
Created: 2026-07-24

## Settings
- [ ] Testing: no (explicit task constraint; changes are comments only)
- [ ] Logging: verbose by workflow default; do not add or alter runtime logging because the scope is documentation-only
- [ ] Docs: no (explicit task constraint; do not update public documentation, README, or API guides)

## Roadmap Linkage
Milestone: "Этап 9. Качество кода и документация"
Rationale: План закрывает явно указанную в milestone задачу по русскоязычному JSDoc для suggestion-движка, TableHandlePlugin и floating-позиционеров.

## Scope and Decisions
- [x] Изменять только русскоязычные JSDoc-комментарии в исходниках `packages/editor/src` и `packages/schema/src`; не менять исполняемую логику, типы, экспорты, DOM-разметку и CSS.
- [x] Документировать назначение публичных точек входа и нетривиальных внутренних функций, ключевые состояния, входные данные, побочные эффекты и ограничения, а не пересказывать очевидный синтаксис.
- [x] Для suggestion-движка зафиксировать жизненный цикл ProseMirror plugin state, условия поиска триггера, идентичность inline-декорации, отмену асинхронной загрузки items и cleanup floating-ui.
- [x] Для таблиц зафиксировать связь состояния hover/freeze/selection с DOM-событиями, глобальный drag context, создание drag preview, допустимые цели drop и обязательное снятие `draggingState`.
- [x] Для floating-позиционеров описать virtual reference, fallback-квадраты, teleport/overlay target, реактивные причины `update()` и правило сохранения ProseMirror selection при штатном закрытии меню.
- [x] Не добавлять runtime-диагностику, тесты, changelog или внешнюю документацию; source-level JSDoc является предметом задачи, а не документационным checkpoint.

## Tasks

### Phase 1: Document editor-state engines
- [x] **Task 1: Add Russian JSDoc to the suggestion engine’s state, matching, rendering, and positioning paths.** Expand the entry-point comment and add targeted comments for the plugin-state transition calculation, trigger matching rules, decoration identity, async item-fetch lifecycle, client-rect fallback, mount/auto-update/outside-click lifecycle, and cleanup ownership. Explain the inputs that affect behavior (`char`, prefix and whitespace policy, selection/composition state, `minQueryLength`, debounce, `AbortSignal`, renderer callbacks, floating-ui options), plus constraints such as stale async results, dismissed range reset, missing decoration DOM, invalid container selector fallback, and detached floating elements. **Files:** `packages/editor/src/utils/suggestion/suggestion.ts`, `packages/editor/src/utils/suggestion/types.ts`, `packages/editor/src/utils/suggestion/state.ts`, `packages/editor/src/utils/suggestion/matching.ts`, `packages/editor/src/utils/suggestion/decorations.ts`, `packages/editor/src/utils/suggestion/plugin.ts`, `packages/editor/src/utils/suggestion/positioning.ts`. **Logging:** do not add, remove, or change logger/console calls; comments must not expose document content or suggest logging sensitive editor data. **Dependencies:** none.

- [x] **Task 2: Add Russian JSDoc to `TableHandlePlugin` and table drag-and-drop coordination.** Describe `TableHandleView` as the event-driven bridge between ProseMirror, DOM geometry, and emitted `TableHandleState`; document hover/mouse/selection/freeze states, throttled pointer processing, listener ownership and disposal, and the `freezeHandles`/`unfreezeHandles` command contract. Document the shared active drag context, preview construction and cleanup, original/current row or column indices, pointer-derived movement, drop validation, document transaction effects, and the invariant that terminal drag paths clear `draggingState`. Cover the drag-source decoration and the semantics of `TableHandleState`/`TableDraggingState` fields so UI consumers do not infer unsupported behavior. **Files:** `packages/schema/src/extensions/table-handle/plugin.ts`, `packages/schema/src/extensions/table-handle/drag-and-drop.ts`, `packages/schema/src/extensions/table-handle/decorations.ts`, `packages/schema/src/extensions/table-handle/types.ts`. **Logging:** do not add or modify runtime logs; keep error behavior and drag cleanup unchanged. **Dependencies:** none.

### Phase 2: Document floating UI boundaries and verify scope
- [x] **Task 3: Document the Vue-facing floating-positioning contracts.** Add Russian JSDoc to table-handle virtual-reference geometry and size middleware, including clamping during row/column drag and post-render reactive updates. Document suggestion floating components’ selection-preservation rule, outside-pointer exception, drag-triggered close, virtual reference sources, and lifecycle cleanup. Document the primitive wrapper’s role as a presentation-only teleport bridge that forwards computed floating styles and returns the real HTMLElement through `v-model`, without owning positioning. Audit the remaining direct `useFloating` consumers and only annotate additional nontrivial control-flow where the same hidden constraints exist; leave simple declarative calls untouched. **Files:** `packages/editor/src/composables/useTableHandlePositioning.ts`, `packages/editor/src/components/ui/suggestion/FloatingElement.vue`, `packages/editor/src/components/ui/suggestion/SuggestionMenu.vue`, `packages/editor/src/components/primitives/floating-positioning-wrapper/FloatingPositioningWrapper.vue`; audit `packages/editor/src/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `packages/editor/src/components/primitives/menu/MenuContent.vue`, `packages/editor/src/components/primitives/popover/Popover.vue`, `packages/editor/src/components/primitives/tooltip/Tooltip.vue`, and `packages/editor/src/components/table/table-selection/TableSelectionOverlay.vue`. **Logging:** no runtime logging changes; JSDoc must state behavioral limits without introducing diagnostics. **Dependencies:** Task 1 for consistent floating-ui terminology.

- [x] **Task 4: Review documentation quality and preserve behavior-only scope.** Check every added block for Russian clarity, correct JSDoc attachment to the intended exported symbol or complex branch, and consistency with existing terminology (`ProseMirror`, `floating-ui`, `virtual reference`, `freeze`, `draggingState`). Verify the diff contains no executable-code, type, export, style, test, public-doc, or runtime-logging changes; run the configured formatting/lint check only if it can validate comments without generating unrelated changes, then run `git diff --check`. **Files:** all files changed in Tasks 1–3; no new files. **Logging:** do not add temporary instrumentation; verify the absence of logging changes in the diff. **Dependencies:** Tasks 1–3.

  - [x] Rework 2026-07-24: уточнены JSDoc для hover-геометрии table handle во время drag-over и для передачи `HTMLElement | null` через `v-model:floatingElement` после фильтрации component instance.
  - [x] Rework 2026-07-24: уточнён контракт `null` freeze-meta как сохранённого plugin-state и неактивный sentinel `{ from: 0, to: 0 }` у suggestion `range`.

## Completion Criteria
- [x] Russian JSDoc explains purpose, state, inputs, side effects, and limits of the custom suggestion engine without changing its plugin or async behavior.
- [x] `TableHandlePlugin` and drag-and-drop helpers document freeze, hover/selection, preview, drop, and cleanup invariants needed by editor and table UI maintainers.
- [x] Floating-positioning comments explain virtual references, geometry fallbacks, update triggers, teleport ownership, dismissal behavior, and lifecycle cleanup where the code is nontrivial.
- [x] The final diff is comments-only in the specified source areas, introduces no runtime logging or public documentation changes, and passes whitespace validation.
