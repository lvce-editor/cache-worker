// @ts-expect-error @babel/preset-typescript does not provide TypeScript declarations
import pluginTypeScript from '@babel/preset-typescript'
import { babel } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { rollup, type RollupOptions } from 'rollup'

const options: RollupOptions = {
  preserveEntrySignatures: 'strict',
  treeshake: {
    propertyReadSideEffects: false,
  },
  external: [/^electron$/, /^ws$/, /^node:/],
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      presets: [pluginTypeScript],
    }),
    nodeResolve({
      browser: true,
      extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
    }),
  ],
}

export const bundleJs = async (input: string, file: string): Promise<void> => {
  const bundle = await rollup({
    ...options,
    input,
  })

  try {
    await bundle.write({
      file,
      format: 'es',
      freeze: false,
      generatedCode: {
        constBindings: true,
        objectShorthand: true,
      },
    })
  } finally {
    await bundle.close()
  }
}
