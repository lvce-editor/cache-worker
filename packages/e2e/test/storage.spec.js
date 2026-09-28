import { expect, test } from '@playwright/test'

test('Cache Storage supports get, set, and remove through worker RPC', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { ModuleWorkerRpcParent } = await import('/.tmp/e2e/rpcClient.js')
    const rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: '/.tmp/dist/cacheWorkerMain.js' })
    const cacheName = `cache-worker-${crypto.randomUUID()}`
    const key = `/cache-worker/${crypto.randomUUID()}`
    await rpc.invoke('Cache.setCacheStorageItem', key, 'stored text', cacheName)
    const stored = await rpc.invoke('Cache.getCacheStorageItem', key, cacheName)
    const body = new TextDecoder().decode(stored.body)
    const removed = await rpc.invoke('Cache.removeCacheStorageItem', key, cacheName)
    const missing = await rpc.invoke('Cache.getCacheStorageItem', key, cacheName)
    await caches.delete(cacheName)
    await rpc.dispose()
    return { body, removed, missing }
  })
  expect(result).toEqual({ body: 'stored text', removed: true, missing: null })
})

test('IndexedDB persists structured-cloneable values and file handles where supported', async ({ page, browserName }) => {
  await page.goto('/')
  const result = await page.evaluate(async (browserName) => {
    const databaseName = `cache-worker-${crypto.randomUUID()}`
    const { ModuleWorkerRpcParent } = await import('/.tmp/e2e/rpcClient.js')
    const rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: '/.tmp/dist/cacheWorkerMain.js' })
    if (browserName === 'chromium') {
      // Reading an OPFS handle back from IndexedDB crashes this local Chromium build; keep the general structured-clone path covered here.
      try {
        await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'value', { name: 'cloneable-value' }, databaseName)
        return await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'value', databaseName)
      } finally {
        await rpc.dispose()
        indexedDB.deleteDatabase(databaseName)
      }
    }
    const root = await navigator.storage.getDirectory()
    const handleName = `handle-${crypto.randomUUID()}`
    const handle = await root.getFileHandle(handleName, { create: true })
    try {
      await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'file', handle, databaseName)
      const restored = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'file', databaseName)
      return { sameEntry: await restored.isSameEntry(handle) }
    } finally {
      await rpc.dispose()
      indexedDB.deleteDatabase(databaseName)
      await root.removeEntry(handleName)
    }
  }, browserName)
  if (browserName === 'chromium') {
    expect(result).toEqual({ name: 'cloneable-value' })
  } else {
    expect(result.sameEntry).toBe(true)
  }
})

test('OPFS supports writing, reading, removing, and rejects path traversal', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { ModuleWorkerRpcParent } = await import('/.tmp/e2e/rpcClient.js')
    const rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: '/.tmp/dist/cacheWorkerMain.js' })
    const name = `cache-worker-${crypto.randomUUID()}.txt`
    await rpc.invoke('Opfs.writeFile', name, 'persistent text')
    const text = await rpc.invoke('Opfs.readFile', name)
    await rpc.invoke('Opfs.removeFile', name)
    let traversalRejected = false
    try {
      await rpc.invoke('Opfs.readFile', '../outside.txt')
    } catch (error) {
      traversalRejected = error instanceof TypeError
    }
    await rpc.dispose()
    return { text, traversalRejected }
  })
  expect(result).toEqual({ text: 'persistent text', traversalRejected: true })
})
