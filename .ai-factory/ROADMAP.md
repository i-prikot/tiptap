# Project Roadmap

> План развития редактора (Vue 3 + TypeScript + Tiptap v3) как **встраиваемой
> библиотеки для сервиса Tinyfy**, развиваемой в отдельном репозитории.
> Пункты расположены в логическом порядке выполнения: инфраструктура качества →
> типизация → тестовый фундамент → границы библиотеки → пакетизация и публикация →
> интеграция в Tinyfy → Vue-практики → производительность → локализация →
> качество кода → технический долг → развитие (коллаборация, AI).
>
> Принятые продуктовые решения (2026-07-05):
> - **Назначение**: редактор — компонент кабинета Tinyfy (Vue 3). Читатели
>   опубликованных страниц получают **статический HTML без JS редактора**
>   (принцип Tinyfy «скорость — это статус», TTFB < 50 ms).
> - **Форма поставки**: монорепозиторий из пакетов
>   `@tinyfy/editor-schema` (изоморфный набор расширений, без Vue),
>   `@tinyfy/editor` (Vue-компонент + стили),
>   `@tinyfy/renderer` (серверный рендер Tiptap JSON → HTML)
>   и `apps/playground` (текущее демо-приложение для разработки).
> - **Источник истины документа**: Tiptap JSON + поле `schemaVersion`;
>   хранение — бэкенд Tinyfy (Node.js + MySQL). HTML публичной страницы —
>   производный артефакт, генерируемый `@tinyfy/renderer`.
> - **AI**: платное расширение Tiptap Pro AI не используется; в перспективе —
>   собственное AI-расширение (Этап 11).
> - **Коллаборация**: внедряется позднее, после появления собственной
>   бэкенд-части (Этап 11).
> - **Вставка таблиц**: из Google Sheets — работает; Excel — не проверено
>   (нет установленного Excel).

## Milestones

### Этап 2. Тестирование: фундамент (до рефакторинга и пакетизации)

- [ ] Установить и настроить Vitest (`vitest.config.ts`, environment `jsdom`/`happy-dom`)
- [ ] Установить и настроить Vue Test Utils + `@vitest/coverage-v8`
- [x] Добавить npm-скрипты `test`, `test:watch`, `test:coverage`
- [ ] Принять TDD-регламент: новые фичи и рефакторинг начинаются с падающего теста (зафиксировать в `.ai-factory/RULES.md`)
- [ ] Написать unit-тесты на чистые утилиты: `document-id.ts`, `user-utils.ts`, `throttle.ts`, `toc-utils.ts`
- [ ] Написать unit-тесты на `tiptap-utils.ts` (sanitizeUrl, clamp, parseShortcutKeys, handleImageUpload)
- [ ] Написать unit-тесты на `table-utils.ts` (getTable, cellsOverlapRectangle, countEmpty*, selectCellsByCoords)
- [ ] Написать unit-тесты на `table-actions.ts` (can/do: move, duplicate, sort, merge/split, header toggle)
- [ ] Написать unit-тесты на `selection-utils.ts` и `trigger-utils.ts`
- [ ] Написать unit-тесты на suggestion-движок (`utils/suggestion/suggestion.ts`): dismissedRange, debounce, minQueryLength
- [ ] Написать unit-тесты на конверсию блоков (`blocks/block-conversion.ts`, `useBlockConversions.ts`)
- [ ] Написать unit-тесты на кастомные расширения: `indent.ts`, `list-normalization.ts`, `node-background.ts`, `node-alignment.ts`
- [ ] Написать component-тесты примитивов: `Button`, `Popover`, `DropdownMenu`, `Menu`, `Tooltip`, `Avatar`
- [ ] Написать integration-тесты создания редактора: `EditorProvider` монтируется, расширения регистрируются, seed-контент вставляется по правилам `hasInteracted`
- [ ] Написать integration-тесты критических сценариев: ввод `/` открывает slash-меню, Enter вставляет блок
- [ ] Написать integration-тесты таблиц: вставка 3×3, добавление/удаление строки, merge/split, запрет удаления последней строки
- [ ] Написать integration-тесты форматирования: bold/italic/highlight, установка и снятие ссылки
- [ ] Написать integration-тест graceful degradation: без конфигурации collab редактор работает локально, с неполной конфигурацией — показывается `SetupError`
- [ ] Перенести смоук-сценарий из `scratchpad/smoke-test.mjs` в воспроизводимый e2e (Playwright) и включить в CI
- [ ] Довести покрытие тестами до 70%+ и включить порог coverage в CI


## Completed

| Date | Milestone | Work |
| --- | --- | --- |
| 2026-07-10 | Этап 2. Тестирование: фундамент (до рефакторинга и пакетизации) | Проверены npm-скрипты `test`, `test:watch`, `test:coverage`; coverage запускается через `@vitest/coverage-v8`. |
| 2026-07-10 | Этап 1. TypeScript: строгость и типы | Проверены и типизированы Vue `provide/inject` контексты через `InjectionKey<T>`; убраны DI-касты в меню и редакторском контексте. |
| 2026-07-09 | Этап 1. TypeScript: строгость и типы | Создан `src/editor/types/`; общие типы пользователя, TOC, цветов, пунктов меню и suggestion-item вынесены в shared modules; импорты нормализованы. |
| 2026-07-09 | Этап 1. TypeScript: строгость и типы | Устранены четыре использования `any` в `slash-menu-items.ts`; добавлены точные типы slash-menu items и Tiptap command augmentation. |
| 2026-07-10 | Этап 1. TypeScript: строгость и типы | Заменён каст `provideTiptapEditor(editor as never)` в `EditorProvider.vue` на корректно типизированный provide/inject контракт редактора. |
| 2026-07-09 | Этап 0. Инфраструктура качества | Настроен pre-commit хук Husky с lint-staged для lint/format изменённых файлов и проектным typecheck перед коммитом. |
| 2026-07-08 | Этап 0. Инфраструктура качества | Подключен Prettier, согласован с ESLint, добавлены npm-скрипты format/format:check. |
