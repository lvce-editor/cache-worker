import { assertEqual, createRpc } from './_helpers.js'

export const test = async () => {
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const rpc = await createRpc()
  try {
    const result = await rpc.invoke('Cache.setCacheStorageItem', '/invalid-header', 'text', cacheName, {
      'Bad Header': 'value',
    })
    if (result.success || result.errorCode !== 'CACHE_STORAGE_WRITE_FAILED' || !result.errorMessage) {
      throw new Error(`Invalid Cache Storage headers should return a failure: ${JSON.stringify(result)}`)
    }
    assertEqual(result.success, false, 'Invalid Cache Storage write should fail')
  } finally {
    await rpc.dispose()
    await caches.delete(cacheName)
  }
}
