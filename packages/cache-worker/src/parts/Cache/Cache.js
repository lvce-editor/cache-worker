const getCacheStorage = () => {
  if (typeof caches === 'undefined') {
    throw new Error('Cache Storage is not available in this context')
  }
  return caches
}

export const getCacheStorageItem = async (request, cacheName = 'lvce-cache') => {
  const cache = await getCacheStorage().open(cacheName)
  const response = await cache.match(request)
  if (!response) {
    return null
  }
  return {
    body: await response.arrayBuffer(),
    headers: [...response.headers.entries()],
    status: response.status,
    statusText: response.statusText,
  }
}

export const setCacheStorageItem = async (request, value, cacheName = 'lvce-cache') => {
  const cache = await getCacheStorage().open(cacheName)
  const response = new Response(value)
  await cache.put(request, response)
}

export const removeCacheStorageItem = async (request, cacheName = 'lvce-cache') => {
  const cache = await getCacheStorage().open(cacheName)
  return cache.delete(request)
}
