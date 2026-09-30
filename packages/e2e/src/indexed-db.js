import { assertEqual, createRpc, deleteDatabase } from './_helpers.js'

export const test = async () => {
  const databaseName = `cache-worker-${crypto.randomUUID()}`
  const rpc = await createRpc()
  const isChromium = navigator.userAgent.includes('Chrome/')
  if (isChromium) {
    // Reading an OPFS handle back from IndexedDB crashes this local Chromium build; keep the general structured-clone path covered here.
    try {
      await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'value', { name: 'cloneable-value' }, databaseName)
      const result = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'value', databaseName)
      assertEqual(result, { name: 'cloneable-value' }, 'IndexedDB should preserve structured-cloneable values')
    } finally {
      await rpc.dispose()
      await deleteDatabase(databaseName)
    }
    return
  }
  const root = await navigator.storage.getDirectory()
  const handleName = `handle-${crypto.randomUUID()}`
  const handle = await root.getFileHandle(handleName, { create: true })
  try {
    await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'file', handle, databaseName)
    const restored = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'file', databaseName)
    assertEqual(await restored.isSameEntry(handle), true, 'IndexedDB should restore the same file handle')
  } finally {
    await rpc.dispose()
    await deleteDatabase(databaseName)
    await root.removeEntry(handleName)
  }
}
