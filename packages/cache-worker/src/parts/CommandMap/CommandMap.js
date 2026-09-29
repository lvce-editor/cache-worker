import * as Cache from '../Cache/Cache.js'
import * as IndexedDb from '../IndexedDb/IndexedDb.js'
import * as Opfs from '../Opfs/Opfs.js'

export const commandMap = {
  'Cache.getCacheStorageItem': Cache.getCacheStorageItem,
  'Cache.setCacheStorageItem': Cache.setCacheStorageItem,
  'Cache.removeCacheStorageItem': Cache.removeCacheStorageItem,
  'IndexedDb.addIndexedDbFileHandle': IndexedDb.addIndexedDbFileHandle,
  'IndexedDb.getIndexedDbFileHandle': IndexedDb.getIndexedDbFileHandle,
  'IndexedDb.removeIndexedDbFileHandle': IndexedDb.removeIndexedDbFileHandle,
  'Opfs.readFile': Opfs.readFile,
  'Opfs.writeFile': Opfs.writeFile,
  'Opfs.removeFile': Opfs.removeFile,
}
