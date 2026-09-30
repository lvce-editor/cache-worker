export const test = async (): Promise<void> => {
  const { assertEqual, createRpc } = await import('./_helpers.ts')
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const key = `/cache-worker/${crypto.randomUUID()}`
  const bytes = Uint8Array.of(0, 255, 128, 65)
  const rpc = await createRpc()
  try {
    const write = await rpc.invoke<{ readonly success: boolean }>('Cache.setCacheStorageItem', key, bytes, cacheName, {
      'Content-Type': 'application/octet-stream',
    })
    const stored = await rpc.invoke<{ readonly body: ArrayBuffer; readonly headers: Readonly<Record<string, string>> }>(
      'Cache.getCacheStorageItem',
      key,
      cacheName,
    )
    const removed = await rpc.invoke<boolean>('Cache.removeCacheStorageItem', key, cacheName)
    const missing = await rpc.invoke<null | { readonly body: ArrayBuffer }>('Cache.getCacheStorageItem', key, cacheName)
    assertEqual(
      { body: [...new Uint8Array(stored.body)], headers: stored.headers, missing, removed, write },
      {
        body: [...bytes],
        headers: { 'content-type': 'application/octet-stream' },
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
