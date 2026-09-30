export const test = async (): Promise<void> => {
  const { openDB } = await import('idb')
  const { assertEqual, createCacheWorker, deleteDatabase } = await import('./_helpers.ts')
  const databaseName = `cache-worker-${crypto.randomUUID()}`
  const isChromium = navigator.userAgent.includes('Chrome/')
  const database = await openDB(databaseName, 1, {
    upgrade(
      db: Readonly<{
        readonly objectStoreNames: Readonly<Pick<DOMStringList, 'contains'>>
        readonly createObjectStore: (name: string) => unknown
      }>,
    ) {
      db.createObjectStore('file-handles')
    },
  })
  await database.put('file-handles', { name: 'existing-value' }, 'existing-key')
  database.close()
  const cacheWorker = await createCacheWorker(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
  let root: FileSystemDirectoryHandle | undefined
  let handleName: string | undefined
  try {
    const existingValue = await cacheWorker.getIndexedDbFileHandle('existing-key', databaseName)
    assertEqual(existingValue, { name: 'existing-value' }, 'IndexedDB should preserve existing database records')
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
