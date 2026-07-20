# Настройка и проверка `TINYFY_PACKAGES_TOKEN`

Инструкция для публикации пакетов `@i-prikot/*` в GitHub Packages из репозитория `i-prikot/tiptap`.

Публикуются:

- `@i-prikot/editor-schema`
- `@i-prikot/editor`
- `@i-prikot/editor-renderer`

Имена секрета `TINYFY_PACKAGES_TOKEN` и environment `tinyfy-private-package-publish` сохранены исторически; scope пакетов — `@i-prikot`.

## 1. Создать Personal Access Token (classic)

1. Откройте [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens).
2. **Generate new token (classic)**.
3. Scopes:
   - `write:packages`
   - `read:packages`
   - `repo` — если репозиторий приватный и пакеты к нему привязаны
4. Создайте токен и сохраните значение `ghp_...` (показывается один раз).

Токен должен иметь подтверждённый минимальный доступ на запись только для `@i-prikot/editor-schema`, `@i-prikot/editor` и `@i-prikot/editor-renderer`.

## 2. Добавить секрет только в GitHub Environment

Храните `TINYFY_PACKAGES_TOKEN` **исключительно** как **Environment secret** среды
`tinyfy-private-package-publish`, которую использует publish job:

1. [Settings → Environments](https://github.com/i-prikot/tiptap/settings/environments)
2. Среда `tinyfy-private-package-publish` (создайте, если нет)
3. **Add secret**
   - Name: `TINYFY_PACKAGES_TOKEN`
   - Value: PAT из шага 1

Не создавайте repository secret с этим именем. Если такой secret уже существует,
удалите его после переноса значения в `tinyfy-private-package-publish`: repository
secret может быть доступен другим workflow и нарушает границу доступа publish job.

В workflow секрет читается так:

```yaml
NODE_AUTH_TOKEN: ${{ secrets.TINYFY_PACKAGES_TOKEN }}
```

## 3. Проверить токен локально (PowerShell)

Секрет из GitHub Actions локально не читается. Проверяется **тот же PAT**, который положен в секрет.

### 3.1. API GitHub

```powershell
$env:GITHUB_TOKEN = "ghp_..."
Invoke-RestMethod -Headers @{ Authorization = "Bearer $env:GITHUB_TOKEN" } `
  -Uri "https://api.github.com/user"
```

Ожидание: в ответе `"login": "i-prikot"`.

### 3.2. GitHub Packages через npm

`NODE_AUTH_TOKEN` сам по себе `npm whoami` не подхватывает — нужна временная `.npmrc`:

```powershell
$token = "ghp_..."
$npmrc = Join-Path $env:TEMP "github-packages-npmrc"
@"
@i-prikot:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=$token
"@ | Set-Content -Path $npmrc -Encoding ascii

if (-not (Select-String -Path $npmrc -Pattern '^//npm\.pkg\.github\.com/:_authToken=.+$' -Quiet)) {
  throw "Temporary npm configuration has no authentication token."
}
Write-Output "Temporary npm configuration is ready; the token value is not displayed."
npm whoami --userconfig $npmrc --registry=https://npm.pkg.github.com
npm view @i-prikot/editor-schema --userconfig $npmrc --registry=https://npm.pkg.github.com
```

Ожидания:

| Команда      | Результат                   | Смысл                                        |
| ------------ | --------------------------- | -------------------------------------------- |
| `npm whoami` | `i-prikot`                  | токен принят реестром                        |
| `npm view`   | `E404`                      | пакета ещё нет — нормально до первого релиза |
| `npm view`   | версия                      | пакет уже опубликован, read работает         |
| любая        | `401` / `403` / `ENEEDAUTH` | нет scopes packages или пустой `_authToken`  |

После проверки:

```powershell
Remove-Item $npmrc -Force
Remove-Item Variable:token
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
```

## 4. Полная проверка write — только через CI

Write в реестр подтверждается только protected publish job. **Не создавайте и не push'те `v*` tag, пока GitHub administrator не подтвердит environment-only token, точный write scope трёх `@i-prikot/*` packages, environment token attestation, а также policy reviewers, deployment branch policy для environment и active repository tag ruleset.** Workflow проверяет все эти ограничения до publish. После этого:

1. Версии трёх пакетов совпадают (например `0.1.0`).
2. Код с workflows запушен в default branch.
3. Создан и запушен тег `v0.1.0` (имя = `v` + общая версия).
4. Actions: `Prepare GitHub Packages release artifacts` → при успехе `Publish GitHub Packages`.

Успешный publish трёх архивов = токен пишет в `@i-prikot`.

## 5. Что ещё нужно для зелёного publish (кроме токена)

Одного секрета недостаточно. `TINYFY_PACKAGES_TOKEN` должен храниться только в
environment `tinyfy-private-package-publish`; workflow также требует:

1. Environment **`tinyfy-private-package-publish`** с единственным required reviewer — пользователем `i-prikot`; отключите **Prevent self-review**, потому что именно этот личный аккаунт создаёт `v*` release tags. Admin bypass должен оставаться выключенным.
2. Environment variable **`TINYFY_PACKAGES_TOKEN_SCOPE_ATTESTATION`** = `i-prikot-three-package-writes-only`; это единственная attestation variable, которую читает publish workflow.
3. Environment deployment policy, разрешающая только `v*`; её и reviewers workflow проверяет через trusted tooling из protected default branch.
4. Active repository tag ruleset для `refs/tags/v*` с rules `creation`, `update` и `deletion`, bypass только у пользователя `i-prikot`; workflow обязательно проверяет его через trusted tooling из protected default branch.
5. Успешный `Prepare GitHub Packages release artifacts`: publish workflow скачивает его три архива, запускает `verify-publish-artifacts.mjs` и публикует только проверенные байты.

Без этого job упадёт на шагах authorization / artifact verification / attestation ещё до чтения `TINYFY_PACKAGES_TOKEN` и `npm publish`.

## Краткий чеклист

- [ ] Classic PAT с `write:packages` + `read:packages` от `i-prikot`
- [ ] Секрет `TINYFY_PACKAGES_TOKEN` только в environment `tinyfy-private-package-publish` (не repository secret)
- [ ] `npm whoami` → `i-prikot`
- [ ] `npm view @i-prikot/editor-schema` → `E404` или существующая версия
- [ ] Environment + token attestation + tag ruleset настроены
- [ ] После независимого administrator confirmation: push тега `v<shared-version>`
