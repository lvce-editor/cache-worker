export { create as createCacheWorker } from '@lvce-editor/test-worker/cacheWorker'

export const assertEqual = (actual: unknown, expected: unknown, message: string): void => {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, got ${actualJson}`)
  }
}

export const deleteDatabase = (databaseName: string): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName)
    request.onsuccess = (): void => resolve()
    request.onerror = (): void => reject(request.error ?? new Error('Deleting the test database failed'))
    request.onblocked = (): void => reject(new Error('Deleting the test database was blocked'))
  })
