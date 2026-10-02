import type { Test } from '@lvce-editor/test-with-playwright'

export const test: Test = async ({ CacheWorker, Randomization }) => {
  const { assertEqual } = await import('./_helpers.ts')
  const cacheName = `cache-worker-${Randomization.getRandomUUID()}`
  const cacheWorker = await CacheWorker.create(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
  try {
    const result = await cacheWorker.setCacheStorageItem('/invalid-header', 'text', cacheName, {
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
