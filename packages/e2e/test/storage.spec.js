import { expect, test } from '@playwright/test'

test('Cache Storage supports get, set, and remove through worker RPC', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { ModuleWorkerRpcParent } = await import('/.tmp/e2e/rpcClient.js')
    const rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: '/.tmp/dist/cacheWorkerMain.js' })
    const cacheName = `cache-worker-${crypto.randomUUID()}`
    const key = `/cache-worker/${crypto.randomUUID()}`
    const write = await rpc.invoke('Cache.setCacheStorageItem', key, 'stored text', cacheName, { 'Content-Type': 'text/markdown' })
    const stored = await rpc.invoke('Cache.getCacheStorageItem', key, cacheName)
    const body = stored.body
    const removed = await rpc.invoke('Cache.removeCacheStorageItem', key, cacheName)
    const missing = await rpc.invoke('Cache.getCacheStorageItem', key, cacheName)
    await caches.delete(cacheName)
    await rpc.dispose()
    return { body, headers: stored.headers, write, removed, missing }
  })
  expect(result).toEqual({
    body: 'stored text',
    headers: { 'content-type': 'text/markdown' },
    write: { success: true },
    removed: true,
    missing: null,
  })
})

test('Cache Storage write errors are returned as values', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { ModuleWorkerRpcParent } = await import('/.tmp/e2e/rpcClient.js')
    const rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: '/.tmp/dist/cacheWorkerMain.js' })
    try {
      return await rpc.invoke('Cache.setCacheStorageItem', '/invalid-header', 'text', `cache-worker-${crypto.randomUUID()}`, {
        'Bad Header': 'value',
      })
    } finally {
      await rpc.dispose()
    }
  })
  expect(result.success).toBe(false)
  expect(result.errorCode).toBe('CACHE_STORAGE_WRITE_FAILED')
  expect(result.errorMessage).toBeTruthy()
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

test('IndexedDB removes only the requested value through worker RPC and commits the deletion', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const databaseName = `cache-worker-${crypto.randomUUID()}`
    const { ModuleWorkerRpcParent } = await import('/.tmp/e2e/rpcClient.js')
    const rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: '/.tmp/dist/cacheWorkerMain.js' })
    await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'remove-me', { name: 'removed' }, databaseName)
    await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'keep-me', { name: 'kept' }, databaseName)
    await rpc.invoke('IndexedDb.removeIndexedDbFileHandle', 'remove-me', databaseName)
    const removed = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    const kept = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'keep-me', databaseName)
    await rpc.dispose()

    const reopened = await ModuleWorkerRpcParent.create({ commandMap: {}, url: '/.tmp/dist/cacheWorkerMain.js' })
    const persisted = await reopened.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    let missingDeleteResolved = false
    try {
      await reopened.invoke('IndexedDb.removeIndexedDbFileHandle', 'missing', databaseName)
      missingDeleteResolved = true
    } finally {
      await reopened.dispose()
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName)
        request.onsuccess = resolve
        request.onerror = () => reject(request.error)
        request.onblocked = () => reject(new Error('Deleting the test database was blocked'))
      })
    }
    return {
      removed: removed === null || removed === undefined,
      kept,
      persisted: persisted === null || persisted === undefined,
      missingDeleteResolved,
    }
  })
  expect(result).toEqual({ removed: true, kept: { name: 'kept' }, persisted: true, missingDeleteResolved: true })
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
