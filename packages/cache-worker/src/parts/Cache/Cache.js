const getCache = async (cacheName, bucketName, bucketOptions) => {
  if (bucketName) {
    if (typeof navigator === 'undefined' || !navigator.storageBuckets) {
      throw new Error('Storage Buckets are not available in this context')
    }
    const bucket = await navigator.storageBuckets.open(bucketName, bucketOptions)
    return bucket.caches.open(cacheName)
  }
  if (typeof caches === 'undefined') {
    throw new Error('Cache Storage is not available in this context')
  }
  return caches.open(cacheName)
}

export const getCacheStorageItem = async (request, cacheName = 'lvce-cache', bucketName = '', bucketOptions = {}) => {
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

export const setCacheStorageItem = async (request, value, cacheName = 'lvce-cache', headers = {}, bucketName = '', bucketOptions = {}) => {
  try {
    const cache = await getCache(cacheName, bucketName, bucketOptions)
    const response = new Response(value, { headers })
    await cache.put(request, response)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      errorCode: 'CACHE_STORAGE_WRITE_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

export const removeCacheStorageItem = async (request, cacheName = 'lvce-cache', bucketName = '', bucketOptions = {}) => {
  const cache = await getCache(cacheName, bucketName, bucketOptions)
  return cache.delete(request)
}
