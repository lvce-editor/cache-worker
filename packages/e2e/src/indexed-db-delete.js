import { assertEqual, createRpc, deleteDatabase } from './_helpers.js'

export const test = async () => {
  const databaseName = `cache-worker-${crypto.randomUUID()}`
  let rpc
  let reopened
  let removed
  let kept
  try {
    rpc = await createRpc()
    await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'remove-me', { name: 'removed' }, databaseName)
    await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'keep-me', { name: 'kept' }, databaseName)
    await rpc.invoke('IndexedDb.removeIndexedDbFileHandle', 'remove-me', databaseName)
    removed = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    kept = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'keep-me', databaseName)
    await rpc.dispose()
    rpc = undefined
    reopened = await createRpc()
    const persisted = await reopened.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    await reopened.invoke('IndexedDb.removeIndexedDbFileHandle', 'missing', databaseName)
    assertEqual(
      {
        removed: removed === null || removed === undefined,
        kept,
        persisted: persisted === null || persisted === undefined,
      },
      { removed: true, kept: { name: 'kept' }, persisted: true },
      'IndexedDB should commit targeted deletion',
    )
  } finally {
    await rpc?.dispose()
    await reopened?.dispose()
    await deleteDatabase(databaseName)
  }
}
