export { create as createCacheWorker } from '@lvce-editor/test-worker/cacheWorker'

export const assertEqual = (actual: unknown, expected: unknown, message: string): void => {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, got ${actualJson}`)
  }
}

export const deleteDatabase = async (databaseName: string): Promise<void> => {
  const { deleteDB } = await import('idb')
  await deleteDB(databaseName)
}
