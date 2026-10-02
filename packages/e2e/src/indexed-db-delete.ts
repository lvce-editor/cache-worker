export const test = async (): Promise<void> => {
  const { assertEqual, CacheWorker, deleteDatabase, Randomization } = await import('./_helpers.ts')
  const databaseName = `cache-worker-${Randomization.getRandomUUID()}`
  let cacheWorker
  let reopened
  try {
    cacheWorker = await CacheWorker.create(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
    let rejectedInvalidKey = false
    try {
      await cacheWorker.addIndexedDbFileHandle(NaN, { name: 'invalid' }, databaseName)
    } catch {
      rejectedInvalidKey = true
    }
    assertEqual(rejectedInvalidKey, true, 'IndexedDB should reject an invalid key')
    await cacheWorker.addIndexedDbFileHandle('remove-me', { name: 'removed' }, databaseName)
    await cacheWorker.addIndexedDbFileHandle('keep-me', { name: 'kept' }, databaseName)
    await cacheWorker.addIndexedDbFileHandle(42, { name: 'original' }, databaseName)
    await cacheWorker.addIndexedDbFileHandle(42, { name: 'overwritten' }, databaseName)
    await cacheWorker.addIndexedDbFileHandle([1, 'key'], { name: 'array-key' }, databaseName)
    await cacheWorker.removeIndexedDbFileHandle('remove-me', databaseName)
    const removed = await cacheWorker.getIndexedDbFileHandle('remove-me', databaseName)
    const kept = await cacheWorker.getIndexedDbFileHandle('keep-me', databaseName)
    const overwritten = await cacheWorker.getIndexedDbFileHandle(42, databaseName)
    const arrayKey = await cacheWorker.getIndexedDbFileHandle([1, 'key'], databaseName)
    await cacheWorker.dispose()
    cacheWorker = undefined
    reopened = await CacheWorker.create(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
    const persisted = await reopened.getIndexedDbFileHandle('remove-me', databaseName)
    await reopened.removeIndexedDbFileHandle('missing', databaseName)
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
