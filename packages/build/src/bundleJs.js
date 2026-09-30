import { nodeResolve } from '@rollup/plugin-node-resolve'
import { rollup } from 'rollup'

const options = {
  input: 'packages/cache-worker/src/cacheWorkerMain.js',
  preserveEntrySignatures: 'strict',
  treeshake: {
    propertyReadSideEffects: false,
  },
  external: ['electron', 'ws', 'node:*'],
  plugins: [nodeResolve({ browser: true })],
}

export const bundleJs = async () => {
  const bundle = await rollup(options)
  await bundle.write({
    file: '.tmp/dist/cacheWorkerMain.js',
    format: 'es',
    freeze: false,
    generatedCode: {
      constBindings: true,
      objectShorthand: true,
    },
  })
  await bundle.close()
}
