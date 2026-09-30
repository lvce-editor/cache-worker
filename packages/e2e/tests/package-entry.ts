import type { Test } from '@lvce-editor/test-with-playwright'

export const test: Test = async ({ CacheWorker }) => {
  const { assertEqual } = await import('./_helpers.ts')
  const packageModuleUrl = new URL('.tmp/index.js', import.meta.url)
  const { getCacheWorkerUrl } = await import(packageModuleUrl.href)
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const cacheWorker = await CacheWorker.create(getCacheWorkerUrl())
  try {
    const result = await cacheWorker.getCacheStorageItem('/missing', cacheName)
    assertEqual(result, null, 'A missing cache entry should return null')
  } finally {
    await cacheWorker.dispose()
    await caches.delete(cacheName)
  }
}
