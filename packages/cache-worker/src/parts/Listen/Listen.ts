import { MessagePortRpcClient, WebWorkerRpcClient2, type Rpc } from '@lvce-editor/rpc'
import * as Cache from '../Cache/Cache.ts'
import * as CommandMap from '../CommandMap/CommandMap.ts'

export const listen = async (): Promise<void> => {
  await WebWorkerRpcClient2.create({ commandMap: CommandMap.commandMap })
}

export const handleMessagePort = async (messagePort: MessagePort): Promise<void> => {
  await MessagePortRpcClient.create({
    commandMap: CommandMap.commandMap,
    messagePort,
  })
}

export const handleExtensionMessagePort = async (messagePort: MessagePort, extensionId: string): Promise<void> => {
  if (typeof extensionId !== 'string' || extensionId.length === 0) {
    throw new TypeError('extensionId must be a non-empty string')
  }
  const cacheName = `lvce-extension-${extensionId}`
  const extensionCommands = new Map<string, (...args: readonly any[]) => any>([
    ['ExtensionsCache.getCacheStorageItem', (key: string): ReturnType<typeof Cache.getCacheStorageItem> => Cache.getCacheStorageItem(key, cacheName)],
    [
      'ExtensionsCache.removeCacheStorageItem',
      (key: string): ReturnType<typeof Cache.removeCacheStorageItem> => Cache.removeCacheStorageItem(key, cacheName),
    ],
    [
      'ExtensionsCache.setCacheStorageItem',
      (key: string, value: Blob, headers: Readonly<Record<string, string>> = {}): ReturnType<typeof Cache.setCacheStorageItem> =>
        Cache.setCacheStorageItem(key, value, cacheName, headers),
    ],
  ])
  const rpc = (await MessagePortRpcClient.create({
    commandMap: {},
    messagePort,
  })) as Rpc & { readonly ipc: { execute: (command: string, ...args: readonly any[]) => Promise<any> } }
  // MessagePortRpcClient registers command handlers process-wide; bind each
  // extension's namespace to this port so multiple extensions cannot replace it.
  rpc.ipc.execute = async (command: string, ...args: readonly any[]): Promise<any> => {
    const handler = extensionCommands.get(command)
    if (!handler) {
      throw new Error(`Unsupported extension cache command: ${command}`)
    }
    return handler(...args)
  }
  messagePort.addEventListener(
    'close',
    () => {
      void rpc.dispose().catch(() => {})
    },
    { once: true },
  )
}

export const initialize = async (type: string, messagePort: MessagePort): Promise<void> => {
  if (type !== 'message-port') {
    throw new Error(`unsupported initialize type ${type}`)
  }
  await handleMessagePort(messagePort)
}
