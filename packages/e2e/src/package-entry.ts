export const test = async (): Promise<void> => {
  const { assertEqual, ModuleWorkerRpcParent } = await import('./_helpers.ts')
  const packageModuleUrl = new URL('assets/index.js', import.meta.url)
  const { getCacheWorkerUrl } = await import(packageModuleUrl.href)
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const cacheWorker = await ModuleWorkerRpcParent.create({ commandMap: {}, url: getCacheWorkerUrl().href })
  try {
    const result = await cacheWorker.invoke('Cache.getCacheStorageItem', '/missing', cacheName)
    assertEqual(result, null, 'A missing cache entry should return null')
  } finally {
    await cacheWorker.dispose()
    await caches.delete(cacheName)
  }
}
