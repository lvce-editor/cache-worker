type RpcClient = {
  invoke: <T = unknown>(command: string, ...params: readonly unknown[]) => Promise<T>
  dispose: () => Promise<void>
}

// eslint-disable-next-line e2e/no-imports -- Keep the worker RPC import statically visible so the browser bundle can tree-shake Node-only RPC transports.
import { ModuleWorkerRpcParent } from '@lvce-editor/rpc'

export const assertEqual = (actual: unknown, expected: unknown, message: string): void => {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, got ${actualJson}`)
  }
}

export const createRpc = async (url = new URL('.tmp/cacheWorkerMain.js', import.meta.url)): Promise<RpcClient> => {
  return ModuleWorkerRpcParent.create({ commandMap: {}, url: url.href })
}

export const deleteDatabase = (databaseName: string): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName)
    request.onsuccess = (): void => resolve()
    request.onerror = (): void => reject(request.error ?? new Error('Deleting the test database failed'))
    request.onblocked = (): void => reject(new Error('Deleting the test database was blocked'))
  })
