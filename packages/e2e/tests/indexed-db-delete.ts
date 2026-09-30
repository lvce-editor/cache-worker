export const test = async (): Promise<void> => {
  const { assertEqual, createCacheWorker, deleteDatabase } = await import('./_helpers.ts')
  const databaseName = `cache-worker-${crypto.randomUUID()}`
  let cacheWorker
  let reopened
  try {
    cacheWorker = await createCacheWorker(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
    await cacheWorker.addIndexedDbFileHandle('remove-me', { name: 'removed' }, databaseName)
    await cacheWorker.addIndexedDbFileHandle('keep-me', { name: 'kept' }, databaseName)
    await cacheWorker.removeIndexedDbFileHandle('remove-me', databaseName)
    const removed = await cacheWorker.getIndexedDbFileHandle('remove-me', databaseName)
    const kept = await cacheWorker.getIndexedDbFileHandle('keep-me', databaseName)
    await cacheWorker.dispose()
    cacheWorker = undefined
    reopened = await createCacheWorker(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
    const persisted = await reopened.getIndexedDbFileHandle('remove-me', databaseName)
    await reopened.removeIndexedDbFileHandle('missing', databaseName)
    assertEqual(
      {
        kept,
        persisted: persisted === null || persisted === undefined,
        removed: removed === null || removed === undefined,
      },
      { kept: { name: 'kept' }, persisted: true, removed: true },
      'IndexedDB should commit targeted deletion',
    )
  } finally {
    await cacheWorker?.dispose()
    await reopened?.dispose()
    await deleteDatabase(databaseName)
  }
}
