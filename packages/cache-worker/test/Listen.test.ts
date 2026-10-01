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

test('registers the message-port receiver as an internal worker command', () => {
  expect(typeof CommandMap.commandMap['CacheWorker.handleMessagePort']).toBe('function')
})
