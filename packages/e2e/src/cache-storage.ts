export const test = async (): Promise<void> => {
  const { assertEqual, ModuleWorkerRpcParent } = await import('./_helpers.ts')
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const key = `/cache-worker/${crypto.randomUUID()}`
  const jsonKey = `${key}/json`
  const jsonValue = { labels: ['café ☕', 'LVCE'], nested: [1, true, null] }
  const bytes = Uint8Array.of(0, 255, 128, 65)
  const cacheWorker = await ModuleWorkerRpcParent.create({ commandMap: {}, url: new URL('assets/cacheWorkerMain.js', import.meta.url).href })
  const jsonRpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: new URL('assets/cacheWorkerMain.js', import.meta.url).href })
  try {
    const write = await cacheWorker.invoke('Cache.setCacheStorageItem', key, bytes, cacheName, {
      'Content-Type': 'application/octet-stream',
    })
    const stored = await cacheWorker.invoke('Cache.getCacheStorageItem', key, cacheName)
    if (!stored) {
      throw new Error('Cache Storage item was not found after writing')
    }
    const removed = await cacheWorker.invoke('Cache.removeCacheStorageItem', key, cacheName)
    const missing = await cacheWorker.invoke('Cache.getCacheStorageItem', key, cacheName)
    const jsonWrite = await jsonRpc.invoke('Cache.setCacheStorageJsonItem', jsonKey, jsonValue, cacheName)
    const storedJson = await jsonRpc.invoke('Cache.getCacheStorageJsonItem', jsonKey, cacheName)
    assertEqual(
      { body: [...new Uint8Array(stored.body)], headers: stored.headers, jsonWrite, missing, removed, storedJson, write },
      {
        body: [...bytes],
        headers: { 'content-type': 'application/octet-stream' },
        jsonWrite: { success: true },
        missing: null,
        removed: true,
        storedJson: { value: jsonValue },
        write: { success: true },
      },
      'Cache Storage CRUD should round trip',
    )
  } finally {
    await jsonRpc.dispose()
    await cacheWorker.dispose()
    await caches.delete(cacheName)
  }
}
