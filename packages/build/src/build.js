import { build } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'

await rm('.tmp/dist', { force: true, recursive: true })
await rm('.tmp/e2e', { force: true, recursive: true })
await mkdir('.tmp/dist', { recursive: true })
await build({
  entryPoints: ['packages/cache-worker/src/cacheWorkerMain.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  external: ['node:*', 'electron', 'ws'],
  outfile: '.tmp/dist/cacheWorkerMain.js',
})
await mkdir('.tmp/e2e', { recursive: true })
await build({
  entryPoints: ['packages/e2e/src/rpcClient.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  external: ['node:*', 'electron', 'ws'],
  outfile: '.tmp/e2e/rpcClient.js',
})
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
await cp('README.md', '.tmp/dist/README.md')
