export const test = async (): Promise<void> => {
  const { assertEqual, CacheWorker, Randomization } = await import('./_helpers.ts')
  const cacheName = `cache-worker-${Randomization.getRandomUUID()}`
  const key = `/cache-worker/${Randomization.getRandomUUID()}`
  const bytes = Uint8Array.of(0, 255, 128, 65)
  const cacheWorker = await CacheWorker.create(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
  try {
    const write = await cacheWorker.setCacheStorageItem(key, bytes, cacheName, {
      'Content-Type': 'application/octet-stream',
    })
    const stored = await cacheWorker.getCacheStorageItem(key, cacheName)
    if (!stored) {
      throw new Error('Cache Storage item was not found after writing')
    }
    const removed = await cacheWorker.removeCacheStorageItem(key, cacheName)
    const missing = await cacheWorker.getCacheStorageItem(key, cacheName)
    assertEqual(
      { body: [...new Uint8Array(stored.body)], headers: stored.headers, missing, removed, write },
      {
        body: [...bytes],
        headers: { 'content-type': 'application/octet-stream' },
        missing: null,
        removed: true,
        write: { success: true },
      },
      'Cache Storage CRUD should round trip',
    )
  } finally {
    await cacheWorker.dispose()
    await caches.delete(cacheName)
  }
}
