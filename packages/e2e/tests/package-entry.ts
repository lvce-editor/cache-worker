export const test = async (): Promise<void> => {
  const { assertEqual, createRpc } = await import('./_helpers.ts')
  const packageModuleUrl = new URL('.tmp/index.js', import.meta.url)
  const { getCacheWorkerUrl } = await import(packageModuleUrl.href)
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
