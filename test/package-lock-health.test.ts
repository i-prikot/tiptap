import { describe, expect, it } from 'vitest'
import packageLock from '../package-lock.json'

interface LockPackage {
  deprecated?: string
}

interface PackageLock {
  packages: Record<string, LockPackage>
}

const lockfile = packageLock as PackageLock

describe('package lock health', () => {
  it('does not resolve the deprecated lucide-vue-next package', () => {
    expect(lockfile.packages).not.toHaveProperty('node_modules/lucide-vue-next')
  })

  it('does not resolve deprecated glob packages', () => {
    const deprecatedGlobEntries = Object.entries(lockfile.packages)
      .filter(([path, packageEntry]) => path.endsWith('/glob') && packageEntry.deprecated)
      .map(([path, packageEntry]) => ({ path, deprecated: packageEntry.deprecated }))

    expect(deprecatedGlobEntries).toEqual([])
  })
})
