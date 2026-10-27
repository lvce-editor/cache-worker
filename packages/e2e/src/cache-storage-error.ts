export const test = async (): Promise<void> => {
  const { assertEqual, createCacheWorkerRpc } = await import('./_helpers.ts')
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const cacheWorker = await createCacheWorkerRpc(new URL('assets/cacheWorkerMain.js', import.meta.url))
  try {
    const result = await cacheWorker.invoke('Cache.setCacheStorageItem', '/invalid-header', 'text', cacheName, {
      'Bad Header': 'value',
    })
    if (result.success || result.errorCode !== 'CACHE_STORAGE_WRITE_FAILED' || !result.errorMessage) {
      throw new Error(`Invalid Cache Storage headers should return a failure: ${JSON.stringify(result)}`)
    }
    assertEqual(result.success, false, 'Invalid Cache Storage write should fail')
  } finally {
    await cacheWorker.dispose()
    await caches.delete(cacheName)
  }
}
