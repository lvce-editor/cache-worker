import type { Test } from '@lvce-editor/test-with-playwright'

export const test: Test = async ({ CacheWorker }) => {
  const { assertEqual, deleteDatabase } = await import('./_helpers.ts')
  const databaseName = `cache-worker-${crypto.randomUUID()}`
  const isChromium = navigator.userAgent.includes('Chrome/')
  const cacheWorker = await CacheWorker.create(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
  let root: FileSystemDirectoryHandle | undefined
  let handleName: string | undefined
  try {
    if (isChromium) {
      // Reading an OPFS handle back from IndexedDB crashes this local Chromium build; keep the general structured-clone path covered here.
      await cacheWorker.addIndexedDbFileHandle('value', { name: 'cloneable-value' }, databaseName)
      const result = (await cacheWorker.getIndexedDbFileHandle('value', databaseName)) as { readonly name: string }
      assertEqual(result, { name: 'cloneable-value' }, 'IndexedDB should preserve structured-cloneable values')
      return
    }
    root = await navigator.storage.getDirectory()
    handleName = `handle-${crypto.randomUUID()}`
    const handle = await root.getFileHandle(handleName, { create: true })
    await cacheWorker.addIndexedDbFileHandle('file', handle, databaseName)
    const restored = (await cacheWorker.getIndexedDbFileHandle('file', databaseName)) as FileSystemFileHandle
    assertEqual(await restored.isSameEntry(handle), true, 'IndexedDB should restore the same file handle')
  } finally {
    await cacheWorker.dispose()
    await deleteDatabase(databaseName)
    if (root && handleName) {
      await root.removeEntry(handleName)
    }
  }
}
