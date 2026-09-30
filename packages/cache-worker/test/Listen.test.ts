import assert from 'node:assert/strict'
import { MessageChannel } from 'node:worker_threads'
import test from 'node:test'
import { MessagePortRpcParent } from '@lvce-editor/rpc'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.ts'
import * as Listen from '../src/parts/Listen/Listen.ts'

await test('handles cache operations over a transferred message port', async () => {
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
  const entries = new Map<string, Response>()
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      open: async () => ({
        match: async (request: string) => entries.get(request)?.clone(),
        put: async (request: string, response: Response) => entries.set(request, response.clone()),
      }),
    },
  })
  const { port1, port2 } = new MessageChannel()
  const [parentRpc] = await Promise.all([
    MessagePortRpcParent.create({ commandMap: {}, messagePort: port1 as unknown as MessagePort }),
    Listen.handleMessagePort(port2 as unknown as MessagePort),
  ])
  try {
    await parentRpc.invoke('Cache.setCacheStorageItem', '/readme', '# Cached markdown', 'extension-detail-test')
    const cached = await parentRpc.invoke('Cache.getCacheStorageItem', '/readme', 'extension-detail-test')
    assert.equal(cached.body, '# Cached markdown')
    assert.equal(cached.status, 200)
  } finally {
    parentRpc.dispose()
    port2.close()
    if (originalCaches) {
      Object.defineProperty(globalThis, 'caches', originalCaches)
    } else {
      Reflect.deleteProperty(globalThis, 'caches')
    }
  }
})

await test('registers the message-port receiver as an internal worker command', () => {
  assert.equal(typeof CommandMap.commandMap['CacheWorker.handleMessagePort'], 'function')
})
