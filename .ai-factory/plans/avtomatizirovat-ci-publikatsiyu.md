<!-- handoff:task:b0a1d720-42df-4130-9a3d-65cc5c2d7923 -->
# Implementation Plan: Автоматизировать CI-публикацию

Branch: `main`
Created: 2026-07-18
Mode: fast (Autonomous Handoff)

## Goal

Автоматизировать безопасный выпуск `@i-prikot/editor-schema`, `@i-prikot/editor` и
`@i-prikot/editor-renderer` по стратегии **Changesets version PR + выпускной тег**:

1. каждый merge в `main` создаёт или обновляет один Changesets version PR с
   синхронной версией и changelog;
2. после merge этого PR релиз-менеджер создаёт тег `v<shared-version>`;
3. только push тега выполняет проверки, сборку и публикацию в GitHub Packages.

Такой порядок оставляет версионирование ревьюируемым, исключает публикацию от
обычного merge и не передаёт registry credentials workflow, создающему PR.

## Settings

- [x] Testing: rework-исключение — обновить и запустить только целевой тест release authorization, чтобы зафиксировать blocking findings.
- [x] Logging: verbose — диагностировать workflow boundaries и версии без runtime-логов.
- [x] Docs: no — не создавать documentation tasks или обязательную docs checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: Autonomous Handoff-задача ограничена CI-релизным контуром и не меняет
roadmap-артефакт.

## Release Contract

- [x] `main` — единственный источник Changesets version PR; публикация от pull
  request или обычного push в `main` запрещена.
- [x] Tag `v<version>` обязан совпадать с общей версией всех трёх пакетов fixed
  version group.
- [x] Только publishing workflow получает `packages: write`; авторизация идёт
  исключительно через краткоживущий `${{ secrets.GITHUB_TOKEN }}` в
  `NODE_AUTH_TOKEN`.
- [x] Registry config, YAML-логи и скрипты не содержат literal token, PAT или
  их значение.
- [x] Публикация идёт в порядке `editor-schema` → `editor` → `renderer`; root
  workspace и `@i-prikot/playground` никогда не публикуются.

## Prerequisites

- [ ] Реализовать `.ai-factory/plans/vnedrit-changesets.md`: root scripts,
  `.changeset/config.json` и workflow version PR должны быть готовы первыми.
- [ ] Реализовать `.ai-factory/plans/nastroit-publikatsiyu-v-privatnyy-registry.md`:
  библиотеки должны стать publishable, иметь GitHub Packages `publishConfig`, а
  `.npmrc` — только scoped registry mapping без credentials.
- [ ] До первого реального тега подтвердить, что `i-prikot/tiptap` имеет право
  публиковать private packages scope `@i-prikot`. Отсутствие доступа блокирует
  выпуск; не менять package names и не обходить ограничение персональным токеном.

## Tasks

### Phase 1: Establish release inputs

- [x] **Task 1: Финализировать единый контракт версий и release-команд.**
  - [x] Files: `package.json`, `package-lock.json`, `.changeset/config.json`,
    `packages/schema/package.json`, `packages/editor/package.json`,
    `packages/renderer/package.json`.
  - [x] Добавить или подтвердить root-команды создания, просмотра и применения
    Changesets и закрепить `@changesets/cli` в lockfile.
  - [x] Настроить fixed group ровно из трёх библиотек с `baseBranch: main`,
    генерируемыми changelog и исключением root workspace/playground.
  - [x] Сохранить одинаковые версии пакетов и их export maps; не добавлять
    конкурирующий versioning или самостоятельные publish scripts.
  - [x] **Logging:** `INFO` о Changesets phase и результате version PR, `DEBUG`
    только для package names/versions, `ERROR` о fixed-group/version mismatch;
    credentials и package archive contents не логировать.
  - [x] Dependencies: prerequisites completed.

- [x] **Task 2: Зафиксировать безопасный registry и tag-validation boundary.**
  - [x] Files: `.npmrc`, `packages/schema/package.json`,
    `packages/editor/package.json`, `packages/renderer/package.json`,
    `scripts/verify-publish-tag.mjs`.
  - [x] Оставить root private; убрать `private: true` только с трёх библиотек и
    задать им `publishConfig.registry: "https://npm.pkg.github.com"`.
  - [x] Коммитить в `.npmrc` только
    `@i-prikot:registry=https://npm.pkg.github.com`; запретить `:_authToken`, PAT,
    literal `always-auth` и глобальную замену npm registry.
  - [x] Реализовать dependency-free validation: формат `v<version>`, точное
    совпадение всех package versions, ожидаемые names, отсутствие `private` и
    исключение root/playground из publish set.
  - [x] **Logging:** `INFO` для успешной tag/version validation, `DEBUG` только
    для имён/версий, `ERROR` с причиной и package; не читать и не печатать env tokens.
  - [x] Dependencies: Task 1.

### Phase 2: Automate reviewed versioning on `main`

- [x] **Task 3: Добавить least-privilege Changesets version-PR workflow.**
  - [x] Files: `.github/workflows/changesets.yml`.
  - [x] Триггер: только push в `main`; `workflow_dispatch` намеренно запрещён,
    чтобы workflow с `contents: write` и `pull-requests: write` всегда выполнял
    trusted код из `main` при создании/обновлении version PR.
  - [x] Выдать только `contents: write` и `pull-requests: write`; не выдавать
    `packages: write`, `id-token: write`, `NODE_AUTH_TOKEN` или registry secrets.
  - [x] Добавить concurrency по workflow/branch, предотвращающую конкурирующие
    version PR при параллельных merge.
  - [x] До versioning запускать безтестовые quality gates:
    `npm run typecheck`, `npm run lint`, `npm run build`.
  - [x] **Logging:** `INFO` для checkout/install/gates/version PR, `DEBUG` для
    итоговых версий, `ERROR` для failed step и exit status; token values не выводить.
  - [x] Dependencies: Tasks 1–2.

### Phase 3: Publish only an explicit release tag

- [x] **Task 4: Добавить защищённый tag-triggered publishing workflow.**
  - [x] Files: `.github/workflows/publish.yml`, `.github/workflows/ci.yml`.
  - [x] Триггеры publishing workflow: только push tags `v*` и manual dispatch с
    явным `release_tag`; не публиковать от pull request или push в `main`.
  - [x] Настроить `contents: read` и `packages: write` только здесь; использовать
    `actions/setup-node@v4`, Node 22, GitHub Packages registry и scope `@i-prikot`.
  - [x] Выполнять `npm ci`, `typecheck`, `lint`, `build`,
    `node scripts/verify-publish-tag.mjs <resolved-tag>`, затем `npm publish`
    workspaces строго schema → editor → renderer.
  - [x] Передавать `${{ secrets.GITHUB_TOKEN }}` как `NODE_AUTH_TOKEN` только в
    publish-step environment; не помещать token в файлы, CLI arguments, job-wide
    env или diagnostic output.
  - [x] Rework (2026-07-19): удалить runtime-проверки GitHub Rulesets API, так как
    стандартный `GITHUB_TOKEN` не имеет repository-administration read access;
    verifier проверяет только доступные environment reviewer и deployment policy `v*`,
    а `workflow_dispatch` по-прежнему требует точный `refs/tags/<release_tag>` до
    выдачи publishing credentials.
  - [x] Rework (2026-07-19): `verify-release-authorization.mjs` требует
    `can_admins_bypass === false`; fixture и regression test отклоняют environment,
    где administrator может обойти deployment reviewer (finding `e74ac02ba28f`).
  - [x] Добавить concurrency по tag/ref и безопасную ошибку, если immutable
    package version уже опубликована; не пытаться перезаписывать её.
  - [x] Оставить `.github/workflows/ci.yml` PR-only и без package-write прав.
  - [x] **Logging:** `INFO` для resolved tag, gates, validation и package boundaries,
    `DEBUG` для package/version, `ERROR` для failing package/command/status;
    GitHub secret masking обязателен.
  - [x] Dependencies: Tasks 2–3.

### Phase 4: Verify the release boundary without tests

- [ ] **Task 5: Провести release-preflight и закрепить ручные gates первого выпуска.**
  - [x] Files: inspect `package.json`, `package-lock.json`, `.changeset/config.json`,
    `.npmrc`, `scripts/verify-publish-tag.mjs`, `.github/workflows/changesets.yml`,
    `.github/workflows/publish.yml`, `.github/workflows/ci.yml`; менять только
    перечисленные файлы при обнаружении дефекта.
  - [ ] Выполнить `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` и
    `node scripts/verify-publish-tag.mjs v<shared-package-version>`; не запускать
    полный test suite. Rework-исключение: обновить и запустить только целевой
    regression test release authorization.
  - [x] Rework (2026-07-19): обновить и запустить только целевой regression test
    release authorization, подтверждающий отсутствие runtime Rulesets API checks.
  - [x] Статически проверить YAML: `main` workflow создаёт version PR без registry
    credentials; tag workflow — единственный с `packages: write`, а secret
    используется только как `NODE_AUTH_TOKEN` publish step.
  - [x] Выполнить `npm pack --dry-run` для всех трёх packages, проверить archive
    contents и подтвердить отсутствие root/playground в publish set.
  - [ ] Перед первым релизом вручную подтвердить GitHub Packages access для
    `@i-prikot`, затем создать `v<shared-version>` только после merge version PR и
    проверить появление трёх private packages.
  - [x] **Logging:** `INFO` summary для каждого gate, `DEBUG` для archive files и
    version comparison, `ERROR` для unsafe permissions, package access или gate
    failure; secrets и полное archive content не публиковать.
  - [x] Dependencies: Task 4.

## Commit Plan

- [ ] **Commit 1** (after Tasks 1–2): `chore(release): configure changesets and registry validation`
- [ ] **Commit 2** (after Tasks 3–4): `ci(release): automate version PRs and tag publishing`
- [ ] **Commit 3** (after Task 5): `ci(release): verify publication safeguards`

## Completion Criteria

- [x] Merge в `main` создаёт/обновляет один Changesets version PR после
  безтестовых quality checks и без package-write secret.
- [x] Только tag `v<shared-version>` проходит package/tag validation, сборку и
  публикацию библиотек в правильном порядке.
- [x] Publishing job — единственный с `packages: write`; registry authentication
  ограничена `secrets.GITHUB_TOKEN` в `NODE_AUTH_TOKEN`.
- [x] Повторный тот же release tag не может перезаписать immutable package version.
- [x] Rework (2026-07-19): удалены runtime Rulesets API checks, а целевой regression
  test release authorization подтверждает отсутствие недоступных API-вызовов;
  документация не изменялась.
- [x] Rework (2026-07-19): `verify-publish-tag.mjs` отклоняет prerelease-теги до
  package validation, защищая npm `latest` dist-tag; regression coverage добавлено для
  `v1.2.3-rc.1` (finding `dee76a702b34`). `.github/workflows/prepare-publish-artifacts.yml`
  ограничен workflow-level `permissions: { contents: read }` (finding `afc5b05ba818`).
- [x] Rework (2026-07-19): release authorization verifier строго отклоняет
  `can_admins_bypass: true`; dedicated fixture/test покрывает запрет administrator bypass
  для protected publish environment (finding `e74ac02ba28f`).
