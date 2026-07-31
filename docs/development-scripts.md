# Development Scripts

The repository-owned `scripts/` directory contains maintained utilities for
contributors. Put new ad-hoc development utilities there; do not create or
restore a `scratchpad/` workflow.

## Icon barrel

Run the generator after adding, removing, or renaming an icon module:

```bash
npm run icons:generate
```

It scans matching `*-icon.ts` modules in `packages/editor/src/icons/` from the
working directory, including untracked files, and updates only
`packages/editor/src/icons/index.ts`. It does not modify individual
icon modules or generated files under `packages/editor/dist/`.

Use the non-writing check before submitting a change or in automation:

```bash
npm run icons:check
```

A non-zero result means the barrel has drifted. Run `npm run icons:generate`,
review the resulting `index.ts` change, and rerun the check. Icon modules must
provide direct named exports with unique names; the generator reports invalid
filenames or export conflicts without writing partial output.

## Playwright smoke test

Install the configured Chromium browser once after dependencies are installed,
or whenever Playwright reports that the browser executable is unavailable:

```bash
npx playwright install chromium
```

Run the focused browser smoke scenario with:

```bash
npm run test:smoke
```

The launcher runs the existing `e2e/smoke.spec.ts` scenario through the shared
`playwright.config.ts` configuration. Forward Playwright arguments after `--`:

```bash
npm run test:smoke -- --headed
```

Use the full end-to-end command when validating all Playwright scenarios:

```bash
npm run test:e2e
```

Both commands retain the existing Playwright reporting and web-server behavior.
They do not install browsers or rely on Puppeteer, Microsoft Edge, or
machine-specific executable paths.

## Diagnostics and maintenance

The utilities emit concise `INFO` success output and actionable `ERROR` context
on failures. Set `LOG_LEVEL=debug` to include discovery counts, resolved paths,
and forwarded Playwright arguments:

```bash
LOG_LEVEL=debug npm run icons:check
LOG_LEVEL=debug npm run test:smoke -- --list
```

Keep utility changes focused: update this guide when adding a maintained script,
add an explicit root `package.json` command when contributors need to run it,
and avoid making maintenance generators implicit install, build, or test side
effects.
