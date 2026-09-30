import { assertEqual, createRpc } from './_helpers.js'

export const test = async () => {
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const key = `/cache-worker/${crypto.randomUUID()}`
  const rpc = await createRpc()
  try {
    const write = await rpc.invoke('Cache.setCacheStorageItem', key, 'stored text', cacheName, { 'Content-Type': 'text/markdown' })
    const stored = await rpc.invoke('Cache.getCacheStorageItem', key, cacheName)
    const removed = await rpc.invoke('Cache.removeCacheStorageItem', key, cacheName)
    const missing = await rpc.invoke('Cache.getCacheStorageItem', key, cacheName)
    assertEqual(
      { body: stored.body, headers: stored.headers, write, removed, missing },
      {
        body: 'stored text',
        headers: { 'content-type': 'text/markdown' },
        write: { success: true },
        removed: true,
        missing: null,
      },
      'Cache Storage CRUD should round trip',
    )
  } finally {
    await rpc.dispose()
    await caches.delete(cacheName)
  }
}
