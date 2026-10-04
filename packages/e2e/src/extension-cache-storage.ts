export const test = async (): Promise<void> => {
  const { MessagePortRpcParent } = await import('@lvce-editor/rpc')
  const { assertEqual, ModuleWorkerRpcParent, Randomization } = await import('./_helpers.ts')
  const firstExtension = `test-${Randomization.getRandomUUID()}`
  const secondExtension = `test-${Randomization.getRandomUUID()}`
  const regularCacheName = `test-${Randomization.getRandomUUID()}`
  const key = 'same-item-key'
  const bytes = new Blob(['image-bytes'], { type: 'image/webp' })
  const cacheWorker = await ModuleWorkerRpcParent.create({ commandMap: {}, url: new URL('.tmp/cacheWorkerMain.js', import.meta.url).href })
  const firstChannel = new MessageChannel()
  const secondChannel = new MessageChannel()
  let firstRpc: Awaited<ReturnType<typeof MessagePortRpcParent.create>> | undefined
  let secondRpc: Awaited<ReturnType<typeof MessagePortRpcParent.create>> | undefined
  try {
    await Promise.all([
      cacheWorker.invokeAndTransfer('CacheWorker.handleExtensionMessagePort', firstChannel.port2, firstExtension),
      cacheWorker.invokeAndTransfer('CacheWorker.handleExtensionMessagePort', secondChannel.port2, secondExtension),
    ])
    const rpcs = await Promise.all([
      MessagePortRpcParent.create({ commandMap: {}, messagePort: firstChannel.port1 }),
      MessagePortRpcParent.create({ commandMap: {}, messagePort: secondChannel.port1 }),
    ])
    firstRpc = rpcs[0]
    secondRpc = rpcs[1]
    await firstRpc.invoke('ExtensionsCache.setCacheStorageItem', key, bytes, {
      'Content-Type': bytes.type,
      'X-Image-Width': '120',
    })
    const otherNamespace = await secondRpc.invoke('ExtensionsCache.getCacheStorageItem', key)
    const stored = await firstRpc.invoke('ExtensionsCache.getCacheStorageItem', key)
    if (!stored) {
      throw new Error('Extension cache item was not found after writing')
    }
    assertEqual(otherNamespace, null, 'Extension cache namespaces must not collide')
    assertEqual(
      {
        bytes: await new Blob([stored.body], { type: stored.headers['content-type'] }).text(),
        contentType: stored.headers['content-type'],
        imageWidth: stored.headers['x-image-width'],
      },
      { bytes: 'image-bytes', contentType: 'image/webp', imageWidth: '120' },
      'Extension cache must preserve Blob bytes, MIME type, and metadata',
    )
    await cacheWorker.invoke('Cache.setCacheStorageItem', key, bytes, regularCacheName, { 'Content-Type': bytes.type })
    const regularItem = await cacheWorker.invoke('Cache.getCacheStorageItem', key, regularCacheName)
    if (!regularItem) {
      throw new Error('Regular Cache Storage item was not found after writing')
    }
    assertEqual(new TextDecoder().decode(regularItem.body), 'image-bytes', 'Extension ports must leave worker RPC commands available')
  } finally {
    await Promise.all([firstRpc?.dispose(), secondRpc?.dispose()])
    firstChannel.port1.close()
    firstChannel.port2.close()
    secondChannel.port1.close()
    secondChannel.port2.close()
    await cacheWorker.dispose()
    await caches.delete(`lvce-extension-${firstExtension}`)
    await caches.delete(`lvce-extension-${secondExtension}`)
    await caches.delete(regularCacheName)
  }
}
