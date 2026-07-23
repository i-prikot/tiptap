import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

import { publicPageFixtures, publicPageShell } from './public-page-fixture.mjs'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(packageRoot, '../..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const jsonMode = process.argv.includes('--json')

const CORE_CSS_BASELINE = Object.freeze({ raw: 4993, gzip: 1284, brotli: 1084 })
const CORE_CSS_BUDGET = Object.freeze({ raw: 4096, gzip: 1100, brotli: 950 })
const HTML_BUDGETS = Object.freeze({
  'reader-basics': Object.freeze({ raw: 2028, gzip: 880, brotli: 635 }),
  'reader-math': Object.freeze({ raw: 4776, gzip: 1121, brotli: 898 }),
  worstCase: Object.freeze({ raw: 4776, gzip: 1121, brotli: 898 }),
})
const PAYLOAD_METRICS = Object.freeze(['raw', 'gzip', 'brotli'])

const compressionOptions = Object.freeze({
  gzip: 'level 9',
  brotli: 'text mode, maximum quality',
})

function buildRenderer() {
  execFileSync(npmCommand, ['run', 'build', '--workspace=@i-prikot/editor-renderer'], {
    cwd: repositoryRoot,
    stdio: jsonMode ? 'pipe' : 'inherit',
  })
}

function measureBytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8')
  const brotli = brotliCompressSync(bytes, {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    },
  })

  return {
    raw: bytes.byteLength,
    gzip: gzipSync(bytes, { level: 9 }).byteLength,
    brotli: brotli.byteLength,
  }
}

function compareBudget(metrics, budget) {
  const failures = PAYLOAD_METRICS.filter((metric) => metrics[metric] > budget[metric]).map(
    (metric) => `${metric} ${metrics[metric]} > ${budget[metric]}`,
  )

  return { passed: failures.length === 0, failures }
}

function requirePayloadBudget(budget, name) {
  if (!budget) throw new Error(`Missing required payload budget: ${name}`)

  const missingMetrics = PAYLOAD_METRICS.filter((metric) => !Number.isFinite(budget[metric]))

  if (missingMetrics.length > 0) {
    throw new Error(`Payload budget ${name} is missing metrics: ${missingMetrics.join(', ')}`)
  }

  return budget
}

function findWorstCaseMetrics(records) {
  if (records.length === 0) throw new Error('At least one public-page fixture is required')

  return Object.fromEntries(
    PAYLOAD_METRICS.map((metric) => [
      metric,
      Math.max(...records.map((record) => record.metrics[metric])),
    ]),
  )
}

function formatBudget(budget) {
  return budget
    ? `raw ≤ ${budget.raw}, gzip ≤ ${budget.gzip}, brotli ≤ ${budget.brotli}`
    : 'baseline capture'
}

function verifyPackageBoundary() {
  const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'))
  const javascript = manifest.exports?.['.']?.import
  const coreStylesheet = manifest.exports?.['./styles.css']
  const katexStylesheet = manifest.exports?.['./katex.css']
  const entrySource = readFileSync(resolve(packageRoot, javascript), 'utf8')
  const failures = []

  if (coreStylesheet !== './styles.css') failures.push('missing explicit ./styles.css export')
  if (katexStylesheet !== './katex.css') failures.push('missing explicit ./katex.css export')
  if (/import\s*(?:[^'"]+?\s+from\s*)?['"][^'"]+\.css['"]/.test(entrySource)) {
    failures.push('JavaScript entry imports a stylesheet')
  }
  if (/(?:from|import\()\s*['"]@i-prikot\/editor['"]/.test(entrySource)) {
    failures.push('JavaScript entry imports @i-prikot/editor')
  }
  if (
    /(?:from|import\()\s*['"]vue['"]|(?:from|import\()\s*['"]prosemirror-[^'"]+['"]/.test(
      entrySource,
    )
  ) {
    failures.push('JavaScript entry imports client editor UI code')
  }

  return {
    javascript,
    coreStylesheet,
    katexStylesheet,
    katexStatus: 'conditional math-only asset; excluded from non-math public pages',
    passed: failures.length === 0,
    failures,
  }
}

function printTable(records) {
  console.table(
    records.map(({ name, metrics, budget, result }) => ({
      asset: name,
      raw: metrics.raw,
      'gzip-9': metrics.gzip,
      'brotli-text-11': metrics.brotli,
      budget: formatBudget(budget),
      result: result.passed ? 'PASS' : `FAIL: ${result.failures.join('; ')}`,
    })),
  )
}

async function measurePayload() {
  buildRenderer()

  const exports = verifyPackageBoundary()
  const { renderDocument } = await import(
    `${pathToFileURL(resolve(packageRoot, 'dist/index.js')).href}?payloadMeasurement=${Date.now()}`
  )
  const coreCss = readFileSync(resolve(packageRoot, 'styles.css'))
  const katexCss = readFileSync(resolve(repositoryRoot, 'node_modules/katex/dist/katex.css'))
  const pages = publicPageFixtures.map(({ key, document, usesKatex }) => ({
    key,
    html: publicPageShell(renderDocument(document), { usesKatex }),
  }))
  const fixtureRecords = pages.map(({ key, html }) => {
    const budget = requirePayloadBudget(HTML_BUDGETS[key], `HTML_BUDGETS.${key}`)

    return {
      name: `public page: ${key}`,
      metrics: measureBytes(html),
      budget,
    }
  })
  const worstCaseMetrics = findWorstCaseMetrics(fixtureRecords)
  const records = [
    {
      name: 'core reader CSS',
      metrics: measureBytes(coreCss),
      budget: CORE_CSS_BUDGET,
      baseline: CORE_CSS_BASELINE,
    },
    ...fixtureRecords,
    {
      name: 'worst-case public HTML (independent per compression)',
      metrics: worstCaseMetrics,
      budget: requirePayloadBudget(HTML_BUDGETS.worstCase, 'HTML_BUDGETS.worstCase'),
    },
    {
      name: 'KaTeX CSS (math-only increment)',
      metrics: measureBytes(katexCss),
      budget: null,
      conditional: true,
    },
  ].map((record) => ({
    ...record,
    result: record.conditional
      ? { passed: true, failures: [] }
      : compareBudget(record.metrics, record.budget),
  }))
  const budgetFailures = records
    .filter(({ result }) => !result.passed)
    .map(({ name, result }) => ({ name, failures: result.failures }))
  const failures = exports.passed
    ? budgetFailures
    : [...budgetFailures, { name: 'package delivery boundary', failures: exports.failures }]

  return {
    package: '@i-prikot/editor-renderer',
    compression: compressionOptions,
    exports,
    coreCssBaseline: CORE_CSS_BASELINE,
    htmlBaselines: HTML_BUDGETS,
    records,
    passed: failures.length === 0,
    failures,
  }
}

try {
  const report = await measurePayload()

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(
      '[measure:public-payload] Renderer build complete; measuring static public delivery only.',
    )
    console.log('[measure:public-payload] Compression:', compressionOptions)
    console.log('[measure:public-payload] Package exports:', report.exports)
    console.log(
      `[measure:public-payload] Package delivery boundary: ${report.exports.passed ? 'PASS' : `FAIL: ${report.exports.failures.join('; ')}`}`,
    )
    console.log(
      '[measure:public-payload] KaTeX CSS is a conditional math-only increment and is excluded from non-math payloads.',
    )
    console.log('[measure:public-payload] Core CSS baseline:', report.coreCssBaseline)
    printTable(report.records)
    console.log(
      `[measure:public-payload] ${report.passed ? 'PASS' : 'FAIL'}: ${report.passed ? 'all enforced budgets passed' : report.failures.map(({ name }) => name).join(', ')}`,
    )
  }

  if (!report.passed) process.exitCode = 1
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  if (jsonMode) {
    console.log(JSON.stringify({ passed: false, error: message }, null, 2))
  } else {
    console.error('[measure:public-payload] FAIL:', message)
  }

  process.exitCode = 1
}
