import assert from 'node:assert/strict'
import test from 'node:test'
import type { StorageBucketOptions } from '../src/parts/Cache/Cache.ts'
import * as Cache from '../src/parts/Cache/Cache.ts'

type CacheStub = {
  match: (request: string) => Promise<Readonly<Response> | undefined>
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Cache.put receives a native Response value.
  put: (request: string, response: Readonly<Response>) => Promise<void>
}

const withGlobals = async (values: Readonly<Record<string, unknown>>, fn: () => Promise<void>): Promise<void> => {
  const descriptors = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries(values)) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, value })
  }
  try {
    await fn()
  } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor)
      } else {
        Object.defineProperty(globalThis, key, { configurable: true, value: undefined })
      }
    }
  }
}

await test('cache items preserve raw text and headers in the selected storage bucket', async (): Promise<void> => {
  const records = new Map<string, Map<string, Readonly<Response>>>()
  const opened: Array<{ bucketName: string; options: Readonly<StorageBucketOptions> }> = []
  const navigator = {
    storageBuckets: {
      async open(
        bucketName: string,
        options: Readonly<StorageBucketOptions>,
      ): Promise<{ caches: { open: (cacheName: string) => Promise<CacheStub> } }> {
        opened.push({ bucketName, options })
        return {
          caches: {
            async open(cacheName: string): Promise<CacheStub> {
              const key = `${bucketName}:${cacheName}`
              if (!records.has(key)) {
                records.set(key, new Map())
              }
              const entries = records.get(key) ?? new Map<string, Readonly<Response>>()
              records.set(key, entries)
              return {
                async match(request: string): Promise<Readonly<Response> | undefined> {
                  return entries.get(request)
                },
                async put(
                  request: string,
                  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Cache.put receives a native Response value.
                  response: Readonly<Response>,
                ): Promise<void> {
                  entries.set(request, response)
                },
              }
            },
          },
        }
      },
    },
  }
  await withGlobals({ navigator }, async () => {
    const options = { expires: 1234, quota: 1024 }
    assert.deepEqual(
      await Cache.setCacheStorageItem('/readme', '# Hello', 'extensions', { 'Content-Type': 'text/markdown' }, 'extension-cache', options),
      { success: true },
    )
    assert.deepEqual(await Cache.getCacheStorageItem('/readme', 'extensions', 'extension-cache', options), {
      body: '# Hello',
      headers: { 'content-type': 'text/markdown' },
      status: 200,
      statusText: '',
    })
    assert.equal(await Cache.getCacheStorageItem('/readme', 'extensions', 'other-bucket', options), null)
    assert.equal(await Cache.getCacheStorageItem('/readme', 'other-cache', 'extension-cache', options), null)
    assert.deepEqual(opened[0], { bucketName: 'extension-cache', options })
  })
})

await test('cache write failures are returned as error values', async (): Promise<void> => {
  await withGlobals(
    {
      caches: {
        async open(): Promise<{ put: () => Promise<void> }> {
          return {
            async put(): Promise<void> {
              throw new Error('quota exceeded')
            },
          }
        },
      },
    },
    async () => {
      assert.deepEqual(await Cache.setCacheStorageItem('/readme', 'text'), {
        errorCode: 'CACHE_STORAGE_WRITE_FAILED',
        errorMessage: 'quota exceeded',
        success: false,
      })
    },
  )
  await withGlobals(
    {
      navigator: {
        storageBuckets: {
          async open(): Promise<never> {
            throw new Error('bucket unavailable')
          },
        },
      },
    },
    async () => {
      assert.deepEqual(await Cache.setCacheStorageItem('/readme', 'text', 'extensions', {}, 'extension-cache'), {
        errorCode: 'CACHE_STORAGE_WRITE_FAILED',
        errorMessage: 'bucket unavailable',
        success: false,
      })
    },
  )
})
