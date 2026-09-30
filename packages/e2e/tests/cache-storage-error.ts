export const test = async (): Promise<void> => {
  const { assertEqual, createRpc } = await import('./_helpers.ts')
  const cacheName = `cache-worker-${crypto.randomUUID()}`
  const rpc = await createRpc()
  try {
    const result = await rpc.invoke<{ readonly success: boolean; readonly errorCode: string; readonly errorMessage: string }>(
      'Cache.setCacheStorageItem',
      '/invalid-header',
      'text',
      cacheName,
      {
        'Bad Header': 'value',
      },
    )
    if (result.success || result.errorCode !== 'CACHE_STORAGE_WRITE_FAILED' || !result.errorMessage) {
      throw new Error(`Invalid Cache Storage headers should return a failure: ${JSON.stringify(result)}`)
    }
    assertEqual(result.success, false, 'Invalid Cache Storage write should fail')
  } finally {
    await rpc.dispose()
    await caches.delete(cacheName)
  }
}
