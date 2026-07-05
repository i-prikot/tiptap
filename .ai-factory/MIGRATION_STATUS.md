# Статус переноса React → Vue 3

Обновлено: 2026-07-04.

## Выполнено

### Инфраструктура
- Tiptap обновлён до **v3.27** (соответствует оригиналу: `undoRedo`,
  `StarterKit` v3, открытые Emoji/Mathematics/UniqueID/TableOfContents).
- Добавлены зависимости: `@tiptap/extension-*` (v3), `yjs`,
  `@hocuspocus/provider@2` (экспортирует `TiptapCollabProvider`), `katex`,
  `@floating-ui/vue`.
- `vue-tsc` и `vite build` проходят; смоук-тест в headless Edge:
  редактор поднимается с дефолтным контентом без ошибок консоли.

### Утилиты (`src/editor/utils/`)
- `tiptap-utils.ts` — порт lib/tiptap-utils (модуль 680256):
  findNodePosition, focusNextNode, getSelectedBlockNodes,
  getSelectedNodesOfType, isExtensionAvailable, isMark/NodeInSchema,
  isNodeTypeSelected, parseShortcutKeys, sanitizeUrl,
  selectCurrentBlockContent, selectionWithinConvertibleTypes,
  updateNodesAttr, handleImageUpload, MAX_FILE_SIZE, SR_ONLY, clamp.
- `toc-utils.ts` — normalizeHeadingDepths, getScrollableAncestor,
  navigateToHeading, selectNodeAndHideFloating.
- `user-utils.ts` — случайные имя/цвет/id, getAvatar.
- `document-id.ts` — getDocumentId.

### Кастомные расширения (`src/editor/extensions/`)
- `indent.ts`, `list-normalization.ts`, `triple-click-block-selection.ts`
  (inline-расширения из 3xpmbr0kqzhen).
- `ui-state.ts` (35aonnuqri98j), `node-background.ts`, `node-alignment.ts`
  (34p294mqk5mqb), `horizontal-rule.ts`.

### Таблицы (переписаны заново 2026-07-04)

Первый порт таблиц был сделан вручную с ошибками — перенесено заново
дословно по исходникам (чанки 1eb79ylai6rew, 3gf8l96fmxb-u,
2yhkpc8fmweba, 34p294mqk5mqb). Легаси удалено: `paste-table.ts`,
`unique-table-id.ts`, `table-commands.ts`, `table-handle/`,
`TableMobileMenu.vue`, `TableHandleMenu.vue` — таких модулей в оригинале
нет (id таблиц даёт штатный UniqueID с types:['table',…]).

- `extensions/table-kit.ts` — NotionTable/NotionTableCell поверх
  **официального @tiptap/extension-table** (добавлен в зависимости):
  NodeView `div[data-content-type=table] > .tableWrapper >
  (.table-container > table, .table-controls,
  .table-selection-overlay-container)`; columnResizing (min 35 /
  default 120); Backspace при полном CellSelection удаляет таблицу;
  Mod-A выделяет содержимое ячейки. Конфиг как в оригинале:
  `TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } })`.
- `extensions/table-handle.ts` — TableHandlePlugin (hover-состояние
  ручек, freeze/unfreeze, drag&drop строк/столбцов с drag-превью,
  клонирующим вычисленные стили, dropcursor-декорации
  `.tiptap-table-dropcursor`, `.table-cell-dragging-source`), событие
  `editor.emit('tableHandleState')` (+ augmentation EditorEvents).
- `utils/table-utils.ts` — полный порт lib/tiptap-table-utils
  (getTable/getRowOrColumnCells/selectCellsByCoords/selectLastCell/
  runPreservingCursor/countEmpty*/cellsOverlapRectangle/setCellAttr(объект)/
  updateSelectionAfterAction и т.д.). moveTableRow/Column — из
  prosemirror-tables 1.8.5 (@tiptap/pm/tables), форк не нужен.
- `utils/table-actions.ts` — can/do-функции: duplicate, move (c
  проверкой merged/header), header toggle, add (4 стороны), delete,
  sort (asc/desc, пропуск header, пустые в конец), clear (+resetAttrs),
  merge/split.
- `composables/useTableHandleState.ts` (событие tableHandleState),
  `useTableHandlePositioning.ts` (floating-ui: ручки left/top c
  `--table-handle-ref-*`, extend-кнопки bottom/right).
- UI: `TableHandle.vue` (ручки `.tiptap-table-handle-menu.row/.column`,
  draggable, меню в `.table-controls`), `TableHandleMenuContent.vue`
  (header/move/add/sort/Color/Alignment/clear/duplicate/delete),
  `TableSelectionOverlay.vue` (рамка по выделению, угловые точки
  ресайза выделения, rAF-слежение при column-resize),
  `TableCellHandleMenu.vue` (`.expandable-menu-button`, merge/split +
  Color/Alignment/Clear), `TableExtendRowColumnButtons.vue` («+» с
  drag-добавлением/удалением пустых строк/столбцов).
- Проверено e2e (headless Edge): структура NodeView, hover → обе ручки
  в `.table-controls`, меню строки (11 пунктов, строка выделяется),
  Insert row below 5→6, overlay+грип в контейнере таблицы, меню ячейки,
  extend-кнопка 6→7, shift-клик → CellSelection(2), Merge → td[colspan=2],
  Split обратно, Header row для первой строки. Ошибок консоли нет.

### NodeView-узлы (`src/editor/nodes/`)
- `image/` — Image c подписью, `data-align`, ресайзом (ImageNodeView.vue).
- `image-upload/` — ImageUploadNode: дропзона, прогресс, отмена.
- `toc/` — TocNode + TocNodeView.vue.

### Composables (React hooks/contexts → `src/editor/composables/`)
- `useTiptapEditor` (EditorContext), `useUiEditorState`, `useUser`,
  `useCollab`, `useAi`, `useToc`, `useScrollToHash`, `useTableHandleState`.

### Оболочка (`src/editor/components/notion/`)
- `NotionEditor` → `NotionEditorContent` → `EditorProvider` →
  `EditorContentArea`; `NotionEditorHeader` (undo/redo, ThemeToggle,
  CollabUsers), `TocSidebar`, `LoadingSpinner`, `SetupError`, `CtaPopup`.
- Полный конфиг расширений из оригинального `useEditor` (кроме `Ai`).
- Посев дефолтного контента (`hasInteracted-<docId>` в localStorage).

### Примитивы (`src/editor/components/primitives/`)
- Button (+Tooltip на floating-ui), Badge, Separator, Spacer, ButtonGroup,
  Avatar/AvatarImage/AvatarFallback/AvatarGroup,
  DropdownMenu (Trigger/Content/Group/Item/Label).

### Стили
- Все CSS-чанки перенесены дословно в `src/editor/styles/*` и
  подключены в `main.ts` (см. комментарии соответствия чанкам).
- `design-tokens.css` заменён полным оригиналом (40ba9r0t45n1c).

## Осознанные отличия от оригинала

1. **Collaboration** включается только при `VITE_TIPTAP_COLLAB_APP_ID`
   (+`VITE_TIPTAP_COLLAB_TOKEN` или `VITE_TIPTAP_COLLAB_TOKEN_URL`).
   Без конфигурации редактор работает локально (StarterKit undoRedo).
   Оригинал без переменных окружения показывал экран SetupError и был
   неработоспособен.
2. **AI (расширение `Ai`, AiMenu, ImproveDropdown, AiAskButton)** —
   распространяется только через платный registry Tiptap Pro; в порт не
   включено. AI-кнопки скрываются штатной логикой
   `isExtensionAvailable(editor, 'ai')`. Контекст `useAi` портирован.
3. `immediatelyRender: false` — не нужен (React SSR-опция).
4. **Floating toolbar после drag&drop блока** не всплывает автоматически
   над перенесённым (выделенным) блоком — подавлен до следующего
   pointerdown/keydown в редакторе (в оригинале всплывает; убрано
   осознанно по UX-решению). Во время самого переноса тулбар скрыт
   через `uiState.isDragging`.

### Suggestion-меню (задача 6, частично)
- `utils/suggestion/suggestion.ts` — порт форка suggestion-плагина шаблона
  (dismissedRange, inline-декорация, debounce/minQueryLength, mount).
- `utils/selection-utils.ts`, `utils/trigger-utils.ts` (addEmoji/MentionTrigger),
  `composables/useMenuNavigation.ts`, Card-примитивы.
- `SuggestionMenu.vue` (generic) + **SlashDropdownMenu** (все 17 пунктов
  с группами AI/Style/Insert/Upload; AI-пункты скрыты без расширения),
  **EmojiDropdownMenu**, **MentionDropdownMenu** (демо-каталог 20 юзеров).
- `icons/index.ts` — все 96 иконок сгенерированы из чанков
  (scratchpad/extract-icons.mjs + generate-icons.mjs).
- Проверено в headless Edge: `/` открывает меню (фильтрация, Enter
  вставляет блок), `:smile` — эмодзи, `@emi` — меншен вставляется.

### DragContextMenu (задача 6 завершена)
- Пакеты `@tiptap/extension-drag-handle(-vue-3)` v3 (в v3 open source —
  порт плагина не нужен).
- `composables/useEditorSelectionSignal.ts` — реактивный сигнал
  selectionUpdate (замена React useState+useEffect паттерна tiptap-ui).
- `composables/blocks/` — block-conversion.ts (общий Turn-into конвертер)
  + useText/Heading/List/Blockquote/CodeBlock composables.
- `composables/useNodeActions.ts` — useDuplicate, useCopyToClipboard,
  useCopyAnchorLink, useResetAllFormatting, useDeleteNode,
  useImageDownload, useTocShowTitle, useTableFitToWidth.
- `composables/useIsBreakpoint.ts`.
- Примитив `primitives/menu/` (Menu/MenuContent/MenuGroup/MenuGroupLabel/
  MenuItem, вложенные подменю, closeAll по выбору).
- `ui/SlashCommandTriggerButton.vue` («+», вставляет `/`),
  `ui/DragContextMenu.vue` — грип с меню.
- Проверено e2e: hover → ручка; меню (label «Text», Turn Into / Reset /
  Duplicate / Copy / Anchor / Delete); подменю Turn Into (9 пунктов);
  «Heading 2» конвертирует блок и закрывает цепочку.

### Задачи 5 и 7 (завершены 2026-07-04)

- **Floating-инфраструктура**: `utils/throttle.ts`, `useWindowSize`,
  `useCursorVisibility` (rect body + автоскролл к курсору),
  `useFloatingToolbarVisibility` (мета `hideFloatingToolbar` в toc-utils),
  `FloatingElement.vue` (@floating-ui/vue, виртуальный reference по
  rect выделения, Escape/dragstart скрытие).
- **Цветовая система**: `useColorText` (TEXT_COLORS), `useColorHighlight`
  (HIGHLIGHT_COLORS, mode mark|node, pickHighlightColorsByValue),
  `useRecentColors` (localStorage `tiptapRecentlyUsedColors`),
  ColorTextButton/ColorHighlightButton, ColorTextPopover(+Content —
  recent/text/highlight, навигация стрелками), ColorHighlightPopover
  (+Button, +Content для mobile), PaintBucketIcon добавлен в icons.
- **Link**: `useLinkPopover` (canSetLink, set/remove/open), LinkButton,
  LinkContent (панель URL для mobile), LinkPopover
  (autoOpenOnLinkActive).
- **Кнопки**: TurnIntoDropdown(+Content, `useTurnInto`), MoveNodeButton
  (`useMoveNode`), DeleteNodeButton, ImageUploadButton, ImageAlignButton,
  ImageCaptionButton, ImageDownloadButton, ImageNodeFloating.
- **Примитивы**: Input, InputGroup/Addon/Button/Input.
- **NotionToolbarFloating**: FloatingElement + Toolbar variant=floating:
  TurnInto, марки (bold/italic/underline/strike/code), ImageNodeFloating,
  LinkPopover, ColorTextPopover, «More options» (super/sub, text-align,
  indent/outdent) — в `EditorContentArea`.
- **MobileToolbar** (≤480px, телепорт в body, `bottom: calc(100% - …)`
  через useWindowSize+useCursorVisibility): виды main/highlighter/link,
  меню «ещё» (Color/Turn into/Reset/Duplicate/Copy/Anchor/Delete) на
  Menu-примитивах.
- **DragContextMenu**: добавлены подменю **ColorMenu** (текст + фон
  блока, recent) и **TableAlignMenu** (`useTableAlignCell`, текст +
  вертикаль для ячеек таблицы).
- Проверено e2e (headless Edge): выделение → floating toolbar (9 кнопок);
  Text color поповер (20 цветов, красный применяется в span);
  LinkPopover (URL вставляется, `<a href>` появляется); Turn into
  (9 пунктов); mobile toolbar (18 кнопок, прижат к низу); мобильное
  меню «ещё» открывается; Color в DragContextMenu (20 цветов).

### Фикс позиционирования floating-примитивов (2026-07-04)

- Menu/DropdownMenu/Popover позиционировали `.tiptap-*-content` напрямую —
  CSS-анимация `dropdown-in` (`forwards`) перетирала inline-transform
  floating-ui, и меню улетало в левый верхний угол; `height:100%` в
  menu.css растягивал меню на высоту body.
- Исправлено по схеме оригинала (ariakit 1133ya1qj4hfr / Radix popper):
  **обёртка-позиционер** несёт transform floating-ui, контент с
  анимацией — внутри; `size()` middleware выставляет на обёртку
  переменные, которые ждёт дословно перенесённый CSS:
  `--popover-anchor-width/-available-width/-available-height` (Menu),
  `--radix-dropdown-menu-content-available-height/-transform-origin`,
  `--radix-popover-content-available-height/-transform-origin`.
- Проверено e2e: drag-меню слева от грипа, подменю Color справа
  вплотную, TurnInto/ColorPopover под триггером (offset 4), мобильное
  меню «ещё» флипается вверх и ограничено по высоте.

## Осталось (доводка)

- Combobox (Ariakit) не портирован — меню работают без SR-фильтра
  (`Combobox style=SR_ONLY` оригинала опущен).
- Глобальные хоткеи tiptap-ui кнопок (mod+shift+H/T/I, mod+shift+стрелки,
  backspace в useDeleteNode) не привязаны — в оригинале react-hotkeys;
  действия работают по клику.
- Иконки: переносить в `src/editor/icons/index.ts` по мере надобности.

## Как проверять

```bash
cd app
npm run dev        # http://127.0.0.1:5173
npm run build      # vue-tsc + vite build
```

Смоук-тест: `scratchpad/smoke-test.mjs` (puppeteer-core + headless Edge).
