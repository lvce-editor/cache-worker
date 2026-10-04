import * as Cache from '../Cache/Cache.ts'
import * as IndexedDb from '../IndexedDb/IndexedDb.ts'
import * as Listen from '../Listen/Listen.ts'
import * as Opfs from '../Opfs/Opfs.ts'

const handleMessagePort = (messagePort: MessagePort): Promise<void> => Listen.handleMessagePort(messagePort)
const handleExtensionMessagePort = (messagePort: MessagePort, extensionId: string): Promise<void> =>
  Listen.handleExtensionMessagePort(messagePort, extensionId)
const initialize = (type: string, messagePort: MessagePort): Promise<void> => Listen.initialize(type, messagePort)

export const commandMap = {
  'Cache.getCacheStorageItem': Cache.getCacheStorageItem,
  'Cache.removeCacheStorageItem': Cache.removeCacheStorageItem,
  'Cache.setCacheStorageItem': Cache.setCacheStorageItem,
  'CacheWorker.handleExtensionMessagePort': handleExtensionMessagePort,
  'CacheWorker.handleMessagePort': handleMessagePort,
  'IndexedDb.addIndexedDbFileHandle': IndexedDb.addIndexedDbFileHandle,
  'IndexedDb.getIndexedDbFileHandle': IndexedDb.getIndexedDbFileHandle,
  'IndexedDb.removeIndexedDbFileHandle': IndexedDb.removeIndexedDbFileHandle,
  initialize,
  'Opfs.getCacheFileHandle': Opfs.getCacheFileHandle,
  'Opfs.readFile': Opfs.readFile,
  'Opfs.removeFile': Opfs.removeFile,
  'Opfs.writeFile': Opfs.writeFile,
}
