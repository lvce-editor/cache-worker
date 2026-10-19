import { cp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from './root.ts'

const sharedProcessPath = join(root, 'node_modules', '@lvce-editor', 'shared-process', 'index.js')
const sharedProcessUrl = pathToFileURL(sharedProcessPath).toString()
const sharedProcess = await import(sharedProcessUrl)

process.env.PATH_PREFIX = '/cache-worker'
await sharedProcess.exportStatic({
  root,
  extensionPath: '',
  testPath: 'packages/e2e/.tmp',
})

await cp(join(root, 'dist'), join(root, '.tmp', 'static'), { recursive: true })
await rm(join(root, 'dist'), { force: true, recursive: true })
