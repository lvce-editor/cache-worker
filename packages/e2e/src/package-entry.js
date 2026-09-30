import { assertEqual, createRpc } from './_helpers.js'

export const test = async () => {
  const { getCacheWorkerUrl } = await import('./.tmp/index.js')
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const rpc = await createRpc(getCacheWorkerUrl())
  try {
    const result = await rpc.invoke('Cache.getCacheStorageItem', '/missing', cacheName)
    assertEqual(result, null, 'A missing cache entry should return null')
  } finally {
    await rpc.dispose()
    await caches.delete(cacheName)
  }
}
