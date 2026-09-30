export const test = async (): Promise<void> => {
  const { assertEqual, createCacheWorker } = await import('./_helpers.ts')
  const packageModuleUrl = new URL('.tmp/index.js', import.meta.url)
  const { getCacheWorkerUrl } = await import(packageModuleUrl.href)
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const cacheWorker = await createCacheWorker(getCacheWorkerUrl())
  try {
    const result = await cacheWorker.getCacheStorageItem('/missing', cacheName)
    assertEqual(result, null, 'A missing cache entry should return null')
  } finally {
    await cacheWorker.dispose()
    await caches.delete(cacheName)
  }
}
