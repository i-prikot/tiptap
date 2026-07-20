import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runRegisteredTests } from './release-verifier-vitest-shim.mjs'

const testFiles = process.argv.slice(2).filter((argument) => argument.endsWith('.test.ts'))

if (testFiles.length === 0) {
  throw new Error('Provide at least one release verifier test file.')
}

for (const testFile of testFiles) {
  await import(pathToFileURL(resolve(testFile)).href)
}

await runRegisteredTests()
