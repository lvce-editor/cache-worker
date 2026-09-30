import assert from 'node:assert/strict'
import test from 'node:test'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'

await test('registers the documented storage commands for worker RPC', (): void => {
  assert.deepEqual(
    Object.keys(commandMap).toSorted((left, right) => left.localeCompare(right)),
    [
      'Cache.getCacheStorageItem',
      'Cache.removeCacheStorageItem',
      'Cache.setCacheStorageItem',
      'IndexedDb.addIndexedDbFileHandle',
      'IndexedDb.getIndexedDbFileHandle',
      'IndexedDb.removeIndexedDbFileHandle',
      'Opfs.readFile',
      'Opfs.removeFile',
      'Opfs.writeFile',
    ],
  )
  for (const command of Object.values(commandMap)) {
    assert.equal(typeof command, 'function')
  }
})
