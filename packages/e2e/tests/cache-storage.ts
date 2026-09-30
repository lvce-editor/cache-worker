export const test = async (): Promise<void> => {
  const { assertEqual, createRpc } = await import('./_helpers.ts')
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const key = `/cache-worker/${crypto.randomUUID()}`
  const rpc = await createRpc()
  try {
    const write = await rpc.invoke<{ readonly success: boolean }>('Cache.setCacheStorageItem', key, 'stored text', cacheName, {
      'Content-Type': 'text/markdown',
    })
    const stored = await rpc.invoke<{ readonly body: string; readonly headers: Readonly<Record<string, string>> }>(
      'Cache.getCacheStorageItem',
      key,
      cacheName,
    )
    const removed = await rpc.invoke<boolean>('Cache.removeCacheStorageItem', key, cacheName)
    const missing = await rpc.invoke<null | { readonly body: string }>('Cache.getCacheStorageItem', key, cacheName)
    assertEqual(
      { body: stored.body, headers: stored.headers, missing, removed, write },
      {
        body: 'stored text',
        headers: { 'content-type': 'text/markdown' },
        missing: null,
        removed: true,
        write: { success: true },
      },
      'Cache Storage CRUD should round trip',
    )
  } finally {
    await rpc.dispose()
    await caches.delete(cacheName)
  }
}
