import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

for (const path of ['../dist', '../tsconfig.tsbuildinfo']) {
  rmSync(fileURLToPath(new URL(path, import.meta.url)), {
    force: true,
    recursive: true,
  })
}
