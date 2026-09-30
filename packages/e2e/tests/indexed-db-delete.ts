export const test = async (): Promise<void> => {
  const { assertEqual, createRpc, deleteDatabase } = await import('./_helpers.ts')
  const databaseName = `cache-worker-${crypto.randomUUID()}`
  let rpc
  let reopened
  try {
    rpc = await createRpc()
    await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'remove-me', { name: 'removed' }, databaseName)
    await rpc.invoke('IndexedDb.addIndexedDbFileHandle', 'keep-me', { name: 'kept' }, databaseName)
    await rpc.invoke('IndexedDb.removeIndexedDbFileHandle', 'remove-me', databaseName)
    const removed = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    const kept = await rpc.invoke('IndexedDb.getIndexedDbFileHandle', 'keep-me', databaseName)
    await rpc.dispose()
    rpc = undefined
    reopened = await createRpc()
    const persisted = await reopened.invoke('IndexedDb.getIndexedDbFileHandle', 'remove-me', databaseName)
    await reopened.invoke('IndexedDb.removeIndexedDbFileHandle', 'missing', databaseName)
    assertEqual(
      {
        kept,
        persisted: persisted === null || persisted === undefined,
        removed: removed === null || removed === undefined,
      },
      { kept: { name: 'kept' }, persisted: true, removed: true },
      'IndexedDB should commit targeted deletion',
    )
  } finally {
    await rpc?.dispose()
    await reopened?.dispose()
    await deleteDatabase(databaseName)
  }
}
