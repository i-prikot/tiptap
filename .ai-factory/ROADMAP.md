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

### Этап 1. TypeScript: строгость и типы

- [ ] Включить полный Strict Mode: убрать `"noImplicitAny": false` из `tsconfig.json`
- [ ] Устранить ошибки компиляции, появившиеся после включения `noImplicitAny`
- [x] Устранить все использования `any` в `slash-menu-items.ts` (4 шт.)
- [ ] Устранить `any` в `TableSelectionOverlay.vue`, `EditorContentArea.vue`, `EmojiDropdownMenu.vue`
- [ ] Включить дополнительные строгие флаги: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- [x] Создать `src/editor/types/` и вынести туда общие интерфейсы (пользователь, TOC-элемент, цвет, пункт меню, suggestion-item)
- [ ] Типизировать `import.meta.env`: добавить `env.d.ts` с описанием всех `VITE_TIPTAP_*` переменных (для playground)
- [ ] Заменить каст `provideTiptapEditor(editor as never)` в `EditorProvider.vue` на корректную типизацию
- [ ] Проверить и типизировать все `provide/inject` контексты через `InjectionKey<T>`
- [ ] Ревизия `tiptap-command-types.d.ts` и augmentation-деклараций — свести в одно место


## Completed

| Date | Milestone | Work |
| --- | --- | --- |
| 2026-07-09 | Этап 1. TypeScript: строгость и типы | Создан `src/editor/types/`; общие типы пользователя, TOC, цветов, пунктов меню и suggestion-item вынесены в shared modules; импорты нормализованы. |
| 2026-07-09 | Этап 1. TypeScript: строгость и типы | Устранены четыре использования `any` в `slash-menu-items.ts`; добавлены точные типы slash-menu items и Tiptap command augmentation. |
| 2026-07-09 | Этап 0. Инфраструктура качества | Настроен pre-commit хук Husky с lint-staged для lint/format изменённых файлов и проектным typecheck перед коммитом. |
| 2026-07-08 | Этап 0. Инфраструктура качества | Подключен Prettier, согласован с ESLint, добавлены npm-скрипты format/format:check. |
