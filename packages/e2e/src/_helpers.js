export const assertEqual = (actual, expected, message) => {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, got ${actualJson}`)
  }
}

export const createRpc = async (url = new URL('./.tmp/cacheWorkerMain.js', import.meta.url)) => {
  const { ModuleWorkerRpcParent } = await import('./.tmp/rpcClient.js')
  return ModuleWorkerRpcParent.create({ commandMap: {}, url })
}

export const deleteDatabase = (databaseName) =>
  new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName)
    request.onsuccess = resolve
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Deleting the test database was blocked'))
  })
