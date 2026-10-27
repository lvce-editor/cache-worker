export const test = async (): Promise<void> => {
  const { assertEqual, createCacheWorkerRpc, deleteDatabase } = await import('./_helpers.ts')
  const databaseName = `cache-worker-${crypto.randomUUID()}`
  let cacheWorker
  let reopened
  try {
    cacheWorker = await createCacheWorkerRpc(new URL('assets/cacheWorkerMain.js', import.meta.url))
    let rejectedInvalidKey = false
    try {
      await cacheWorker.invoke('IndexedDb.addIndexedDbFileHandle', NaN, { name: 'invalid' }, databaseName)
    } catch {
      rejectedInvalidKey = true
    }
    assertEqual(rejectedInvalidKey, true, 'IndexedDB should reject an invalid key')
    await cacheWorker.invoke('IndexedDb.addIndexedDbFileHandle', 'remove-me', { name: 'removed' }, databaseName)
    await cacheWorker.invoke('IndexedDb.addIndexedDbFileHandle', 'keep-me', { name: 'kept' }, databaseName)
    await cacheWorker.invoke('IndexedDb.addIndexedDbFileHandle', 42, { name: 'original' }, databaseName)
    await cacheWorker.invoke('IndexedDb.addIndexedDbFileHandle', 42, { name: 'overwritten' }, databaseName)
    await cacheWorker.invoke('IndexedDb.addIndexedDbFileHandle', [1, 'key'], { name: 'array-key' }, databaseName)
    await cacheWorker.invoke('IndexedDb.removeIndexedDbFileHandle', 'remove-me', databaseName)
    const removed = await cacheWorker.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    const kept = await cacheWorker.invoke('IndexedDb.getIndexedDbFileHandle', 'keep-me', databaseName)
    const overwritten = await cacheWorker.invoke('IndexedDb.getIndexedDbFileHandle', 42, databaseName)
    const arrayKey = await cacheWorker.invoke('IndexedDb.getIndexedDbFileHandle', [1, 'key'], databaseName)
    await cacheWorker.dispose()
    cacheWorker = undefined
    reopened = await createCacheWorkerRpc(new URL('assets/cacheWorkerMain.js', import.meta.url))
    const persisted = await reopened.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    await reopened.invoke('IndexedDb.removeIndexedDbFileHandle', 'missing', databaseName)
    assertEqual(
      {
        arrayKey,
        kept,
        overwritten,
        persisted: persisted === null || persisted === undefined,
        removed: removed === null || removed === undefined,
      },
      { arrayKey: { name: 'array-key' }, kept: { name: 'kept' }, overwritten: { name: 'overwritten' }, persisted: true, removed: true },
      'IndexedDB should commit targeted deletion',
    )
  } finally {
    await cacheWorker?.dispose()
    await reopened?.dispose()
    await deleteDatabase(databaseName)
  }
}
