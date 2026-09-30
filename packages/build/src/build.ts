import { build } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { bundleJs } from './bundleJs.ts'
import { getVersion } from './version.ts'

await rm('.tmp/dist', { force: true, recursive: true })
await rm('packages/e2e/src', { force: true, recursive: true })
await mkdir('.tmp/dist', { recursive: true })
await bundleJs()

await build({
  entryPoints: ['packages/cache-worker/src/index.ts'],
  bundle: false,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: '.tmp/dist/index.js',
})

const packageJson = JSON.parse(await readFile('packages/cache-worker/package.json', 'utf8'))
delete packageJson.devDependencies
delete packageJson.dependencies
packageJson.version = await getVersion()
packageJson.main = 'index.js'
packageJson.exports = {
  '.': './index.js',
  './cacheWorkerMain.js': './cacheWorkerMain.js',
}
await writeFile('.tmp/dist/package.json', `${JSON.stringify(packageJson, null, 2)}\n`)
await mkdir('packages/e2e/src/.tmp', { recursive: true })
await cp('.tmp/dist/cacheWorkerMain.js', 'packages/e2e/src/.tmp/cacheWorkerMain.js')
await cp('.tmp/dist/index.js', 'packages/e2e/src/.tmp/index.js')
await build({
  entryPoints: [
    'packages/e2e/tests/cache-storage-error.ts',
    'packages/e2e/tests/cache-storage.ts',
    'packages/e2e/tests/indexed-db-delete.ts',
    'packages/e2e/tests/indexed-db.ts',
    'packages/e2e/tests/opfs.ts',
    'packages/e2e/tests/package-entry.ts',
  ],
  bundle: true,
  entryNames: '[name]',
  outdir: 'packages/e2e/src',
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  external: ['node:*', 'electron', 'ws'],
})
await cp('README.md', '.tmp/dist/README.md')
