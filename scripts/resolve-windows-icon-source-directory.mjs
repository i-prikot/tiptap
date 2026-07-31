import { lstat, realpath } from 'node:fs/promises'
import { join } from 'node:path'

const sourceDirectoryParts = [
  ['packages', 'Icon source directory component packages'],
  ['editor', 'Icon source directory component editor'],
  ['src', 'Icon source directory component src'],
  ['icons', 'Icon source directory'],
]

export function getIconDirectoryPath(iconDirectory) {
  return typeof iconDirectory === 'string'
    ? iconDirectory
    : join(process.platform === 'linux' ? '/proc/self/fd' : '/dev/fd', String(iconDirectory.fd))
}

export async function resolveWindowsIconSourceDirectory(repositoryRoot) {
  let directoryPath = await realpath(repositoryRoot)

  for (const [directoryName, description] of sourceDirectoryParts) {
    directoryPath = join(directoryPath, directoryName)
    const directoryStats = await lstat(directoryPath)

    if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
      throw new Error(`${description} must be a directory and must not be a symbolic link.`)
    }
  }

  return { iconDirectory: directoryPath, handles: [] }
}
