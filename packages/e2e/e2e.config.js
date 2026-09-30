import { defineConfig } from '@lvce-editor/test-with-playwright'

export default defineConfig({
  serverPath: '../server/src/server.js',
  testPath: '.',
})
