import { build } from 'esbuild'

export const bundleJs = async () => {
  await build({
    entryPoints: ['packages/cache-worker/src/cacheWorkerMain.ts'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    external: ['electron', 'ws', 'node:*'],
    outfile: '.tmp/dist/cacheWorkerMain.js',
  })
}
