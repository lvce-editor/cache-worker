import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const locations = [
  'package.json',
  'package-lock.json',
  '.nvmrc',
  '.github/workflows/pr.yml',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  'packages/build/package.json',
  'packages/build/src/computeNodeModulesCacheKey.ts',
  'packages/cache-worker/package.json',
  'packages/e2e/package.json',
]

const contents = await Promise.all(locations.map((location) => readFile(location)))
const hash = createHash('sha1')

for (const content of contents) {
  hash.update(content)
}

process.stdout.write(hash.digest('hex'))
