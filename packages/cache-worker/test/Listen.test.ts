import { expect, test } from '@jest/globals'
import { MessagePortRpcParent } from '@lvce-editor/rpc'
import { MessageChannel } from 'node:worker_threads'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.ts'
import * as Listen from '../src/parts/Listen/Listen.ts'

test.each(['initialize', 'CacheWorker.handleMessagePort'] as const)('handles cache operations through %s', async (command) => {
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
  const entries = new Map<string, Response>()
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      open: async () => ({
        match: async (request: string): Promise<Response | undefined> => entries.get(request)?.clone(),
        put: async (request: string, response: Response): Promise<void> => {
          entries.set(request, response.clone())
        },
      }),
    },
  })
  const { port1, port2 } = new MessageChannel()
  const [parentRpc] = await Promise.all([
    MessagePortRpcParent.create({ commandMap: {}, messagePort: port1 as unknown as MessagePort }),
    command === 'initialize'
      ? CommandMap.commandMap.initialize('message-port', port2 as unknown as MessagePort)
      : Listen.handleMessagePort(port2 as unknown as MessagePort),
  ])
  try {
    await parentRpc.invoke('Cache.setCacheStorageItem', '/readme', '# Cached markdown', 'extension-detail-test')
    const cached = await parentRpc.invoke('Cache.getCacheStorageItem', '/readme', 'extension-detail-test')
    expect(new TextDecoder().decode(cached.body)).toBe('# Cached markdown')
    expect(cached.status).toBe(200)
  } finally {
    await parentRpc.dispose()
    port2.close()
    if (originalCaches) {
      Object.defineProperty(globalThis, 'caches', originalCaches)
    } else {
      delete (globalThis as Record<string, unknown>).caches
    }
  }
})

test('rejects unsupported initialization transports', async () => {
  const { port1, port2 } = new MessageChannel()
  try {
    await expect(CommandMap.commandMap.initialize('unsupported', port2 as unknown as MessagePort)).rejects.toThrow(
      'unsupported initialize type unsupported',
    )
  } finally {
    port1.close()
    port2.close()
  }
})

test('keeps extension cache operations isolated while preserving Blob data and headers', async () => {
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
  const cacheStorage = new Map<string, Map<string, Response>>()
  const openedCacheNames: string[] = []
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      open: async (cacheName: string) => {
        openedCacheNames.push(cacheName)
        let cache = cacheStorage.get(cacheName)
        if (!cache) {
          cache = new Map()
          cacheStorage.set(cacheName, cache)
        }
        return {
          match: async (request: string): Promise<Response | undefined> => cache?.get(request)?.clone(),
          put: async (request: string, response: Response): Promise<void> => {
            cache?.set(request, response.clone())
          },
        }
      },
    },
  })
  const channels = [new MessageChannel(), new MessageChannel()]
  const [firstChannel, secondChannel] = channels
  const [firstRpc, secondRpc] = await Promise.all([
    MessagePortRpcParent.create({ commandMap: {}, messagePort: firstChannel.port1 as unknown as MessagePort }),
    MessagePortRpcParent.create({ commandMap: {}, messagePort: secondChannel.port1 as unknown as MessagePort }),
    Listen.handleExtensionMessagePort(firstChannel.port2 as unknown as MessagePort, 'first.extension'),
    Listen.handleExtensionMessagePort(secondChannel.port2 as unknown as MessagePort, 'second.extension'),
  ])
  try {
    const blob = new Blob(['image-bytes'], { type: 'image/webp' })
    const key = 'same-item-key'
    await firstRpc.invoke('ExtensionsCache.setCacheStorageItem', key, blob, { 'Content-Type': blob.type, 'X-Image-Width': '120' })
    expect(cacheStorage.has('lvce-extension-first.extension')).toBe(true)
    expect(await secondRpc.invoke('ExtensionsCache.getCacheStorageItem', key)).toBeNull()
    expect(openedCacheNames).toEqual(['lvce-extension-first.extension', 'lvce-extension-second.extension'])
    const item = await firstRpc.invoke('ExtensionsCache.getCacheStorageItem', key)
    expect(new Blob([item.body], { type: item.headers['content-type'] }).type).toBe('image/webp')
    expect(new TextDecoder().decode(item.body)).toBe('image-bytes')
    expect(item.headers['x-image-width']).toBe('120')
    await expect(firstRpc.invoke('Cache.getCacheStorageItem', key)).rejects.toThrow()
  } finally {
    await Promise.all([firstRpc.dispose(), secondRpc.dispose()])
    for (const channel of channels) {
      channel.port1.close()
      channel.port2.close()
    }
    if (originalCaches) {
      Object.defineProperty(globalThis, 'caches', originalCaches)
    } else {
      delete (globalThis as Record<string, unknown>).caches
    }
  }
})

test('registers the message-port receiver as an internal worker command', () => {
  expect(typeof CommandMap.commandMap['CacheWorker.handleMessagePort']).toBe('function')
  expect(typeof CommandMap.commandMap['CacheWorker.handleExtensionMessagePort']).toBe('function')
})
