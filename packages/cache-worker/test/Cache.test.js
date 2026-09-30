import assert from 'node:assert/strict'
import test from 'node:test'
import * as Cache from '../src/parts/Cache/Cache.js'

const withGlobals = async (values, fn) => {
  const descriptors = new Map()
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
        delete globalThis[key]
      }
    }
  }
}

test('cache items preserve raw text and headers in the selected storage bucket', async () => {
  const records = new Map()
  const opened = []
  const navigator = {
    storageBuckets: {
      async open(bucketName, options) {
        opened.push({ bucketName, options })
        return {
          caches: {
            async open(cacheName) {
              const key = `${bucketName}:${cacheName}`
              if (!records.has(key)) {
                records.set(key, new Map())
              }
              const entries = records.get(key)
              return {
                async match(request) {
                  return entries.get(request)
                },
                async put(request, response) {
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

test('cache write failures are returned as error values', async () => {
  await withGlobals(
    {
      caches: {
        async open() {
          return {
            async put() {
              throw new Error('quota exceeded')
            },
          }
        },
      },
    },
    async () => {
      assert.deepEqual(await Cache.setCacheStorageItem('/readme', 'text'), {
        success: false,
        errorCode: 'CACHE_STORAGE_WRITE_FAILED',
        errorMessage: 'quota exceeded',
      })
    },
  )
  await withGlobals(
    {
      navigator: {
        storageBuckets: {
          async open() {
            throw new Error('bucket unavailable')
          },
        },
      },
    },
    async () => {
      assert.deepEqual(await Cache.setCacheStorageItem('/readme', 'text', 'extensions', {}, 'extension-cache'), {
        success: false,
        errorCode: 'CACHE_STORAGE_WRITE_FAILED',
        errorMessage: 'bucket unavailable',
      })
    },
  )
})
