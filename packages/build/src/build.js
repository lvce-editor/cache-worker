import { build } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { bundleJs } from './bundleJs.js'

await rm('.tmp/dist', { force: true, recursive: true })
await rm('.tmp/e2e', { force: true, recursive: true })
await rm('packages/e2e/src/.tmp', { force: true, recursive: true })
await mkdir('.tmp/dist', { recursive: true })
await bundleJs()
await mkdir('.tmp/e2e', { recursive: true })
await build({
  entryPoints: ['packages/e2e/src/_rpcClient.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  external: ['node:*', 'electron', 'ws'],
  outfile: '.tmp/e2e/rpcClient.js',
})
await mkdir('packages/e2e/src/.tmp', { recursive: true })
const packageJson = JSON.parse(await readFile('packages/cache-worker/package.json', 'utf8'))
delete packageJson.devDependencies
delete packageJson.dependencies
packageJson.main = 'index.js'
packageJson.exports = {
  '.': './index.js',
  './cacheWorkerMain.js': './cacheWorkerMain.js',
}
await writeFile('.tmp/dist/package.json', `${JSON.stringify(packageJson, null, 2)}\n`)
await cp('packages/cache-worker/src/index.js', '.tmp/dist/index.js')
await cp('.tmp/dist/cacheWorkerMain.js', 'packages/e2e/src/.tmp/cacheWorkerMain.js')
await cp('.tmp/e2e/rpcClient.js', 'packages/e2e/src/.tmp/rpcClient.js')
await cp('packages/cache-worker/src/index.js', 'packages/e2e/src/.tmp/index.js')
await cp('README.md', '.tmp/dist/README.md')
