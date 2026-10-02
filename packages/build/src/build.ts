import { build } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { bundleJs } from './bundleJs.ts'
import { getVersion } from './version.ts'

await rm('.tmp/dist', { force: true, recursive: true })
await rm('packages/e2e/.tmp', { force: true, recursive: true })
await mkdir('.tmp/dist', { recursive: true })
await bundleJs('packages/cache-worker/src/cacheWorkerMain.ts', '.tmp/dist/cacheWorkerMain.js')
await bundleJs('packages/cache-worker/src/index.ts', '.tmp/dist/index.js')

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
await mkdir('packages/e2e/.tmp/src/.tmp', { recursive: true })
await cp('.tmp/dist/cacheWorkerMain.js', 'packages/e2e/.tmp/src/.tmp/cacheWorkerMain.js')
await cp('.tmp/dist/index.js', 'packages/e2e/.tmp/src/.tmp/index.js')
await build({
  entryPoints: [
    'packages/e2e/src/cache-storage-error.ts',
    'packages/e2e/src/cache-storage.ts',
    'packages/e2e/src/indexed-db-delete.ts',
    'packages/e2e/src/indexed-db.ts',
    'packages/e2e/src/opfs.ts',
    'packages/e2e/src/package-entry.ts',
  ],
  bundle: true,
  entryNames: '[name]',
  outdir: 'packages/e2e/.tmp/src',
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  external: ['node:*', 'electron', 'ws'],
})
await cp('README.md', '.tmp/dist/README.md')
