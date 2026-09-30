import { expect, test } from '@jest/globals'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'

test('registers the documented storage commands for worker RPC', (): void => {
  expect(Object.keys(commandMap).toSorted((left, right) => left.localeCompare(right))).toEqual([
    'Cache.getCacheStorageItem',
    'Cache.removeCacheStorageItem',
    'Cache.setCacheStorageItem',
    'CacheWorker.handleMessagePort',
    'IndexedDb.addIndexedDbFileHandle',
    'IndexedDb.getIndexedDbFileHandle',
    'IndexedDb.removeIndexedDbFileHandle',
    'Opfs.readFile',
    'Opfs.removeFile',
    'Opfs.writeFile',
  ])
  for (const command of Object.values(commandMap)) {
    expect(typeof command).toBe('function')
  }
})
