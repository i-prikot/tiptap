import { pathToFileURL } from 'node:url'

const vitestShimUrl = pathToFileURL(
  new URL('./release-verifier-vitest-shim.mjs', import.meta.url).pathname,
).href

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'vitest') {
    return { shortCircuit: true, url: vitestShimUrl }
  }

  return nextResolve(specifier, context)
}
