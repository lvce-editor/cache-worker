export interface StorageBucketOptions {
  readonly expires?: number
  readonly quota?: number
}

interface WorkerStorageBuckets {
  open: (bucketName: string, options: StorageBucketOptions) => Promise<{ caches: CacheStorage }>
}

interface WorkerNavigatorWithStorageBuckets extends Navigator {
  storageBuckets?: WorkerStorageBuckets
}

type CacheHeaders = Readonly<Record<string, string>> | Readonly<Headers> | readonly (readonly [string, string])[]
type CacheRequest = string | Readonly<URL> | Readonly<Request>

export interface CacheStorageItem {
  readonly body: string
  readonly headers: Readonly<Record<string, string>>
  readonly status: number
  readonly statusText: string
}

export type CacheStorageWriteResult =
  { readonly success: true } | { readonly success: false; readonly errorCode: 'CACHE_STORAGE_WRITE_FAILED'; readonly errorMessage: string }

const getCache = async (cacheName: string, bucketName: string, bucketOptions: Readonly<StorageBucketOptions>): Promise<Cache> => {
  if (bucketName) {
    if (typeof navigator === 'undefined') {
      throw new Error('Storage Buckets are not available in this context')
    }
    const { storageBuckets } = navigator as WorkerNavigatorWithStorageBuckets
    if (!storageBuckets) {
      throw new Error('Storage Buckets are not available in this context')
    }
    const bucket = await storageBuckets.open(bucketName, bucketOptions)
    return bucket.caches.open(cacheName)
  }
  if (typeof caches === 'undefined') {
    throw new Error('Cache Storage is not available in this context')
  }
  return caches.open(cacheName)
}

export const getCacheStorageItem = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Keep the Cache API's Request and URL inputs intact.
  request: CacheRequest,
  cacheName = 'lvce-cache',
  bucketName = '',
  bucketOptions: Readonly<StorageBucketOptions> = {},
): Promise<CacheStorageItem | null> => {
  const cache = await getCache(cacheName, bucketName, bucketOptions)
  const response = await cache.match(request)
  if (!response) {
    return null
  }
  return {
    body: await response.text(),
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
    statusText: response.statusText,
  }
}

export const setCacheStorageItem = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Keep the Cache API's Request and URL inputs intact.
  request: CacheRequest,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Preserve the complete set of inputs accepted by the Response constructor.
  value: BodyInit,
  cacheName = 'lvce-cache',
  headers: Readonly<CacheHeaders> = {},
  bucketName = '',
  bucketOptions: Readonly<StorageBucketOptions> = {},
): Promise<CacheStorageWriteResult> => {
  try {
    const cache = await getCache(cacheName, bucketName, bucketOptions)
    const response = new Response(value, { headers: new Headers(headers as HeadersInit) })
    await cache.put(request, response)
    return { success: true }
  } catch (error) {
    return {
      errorCode: 'CACHE_STORAGE_WRITE_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      success: false,
    }
  }
}

export const removeCacheStorageItem = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Keep the Cache API's Request and URL inputs intact.
  request: CacheRequest,
  cacheName = 'lvce-cache',
  bucketName = '',
  bucketOptions: Readonly<StorageBucketOptions> = {},
): Promise<boolean> => {
  const cache = await getCache(cacheName, bucketName, bucketOptions)
  return cache.delete(request)
}
