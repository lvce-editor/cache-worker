const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })

const transactionDone = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })

const openDatabase = (name) => {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this context')
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('file-handles')) {
        request.result.createObjectStore('file-handles')
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB database'))
    request.onblocked = () => reject(new Error(`Opening IndexedDB database "${name}" was blocked`))
  })
}

export const addIndexedDbFileHandle = async (key, handle, databaseName = 'lvce-cache-worker') => {
  const database = await openDatabase(databaseName)
  const transaction = database.transaction('file-handles', 'readwrite')
  const done = transactionDone(transaction)
  const request = transaction.objectStore('file-handles').put(handle, key)
  try {
    await Promise.all([requestResult(request), done])
  } finally {
    database.close()
  }
}

export const getIndexedDbFileHandle = async (key, databaseName = 'lvce-cache-worker') => {
  const database = await openDatabase(databaseName)
  const transaction = database.transaction('file-handles', 'readonly')
  const done = transactionDone(transaction)
  try {
    const value = await requestResult(transaction.objectStore('file-handles').get(key))
    await done
    return value
  } finally {
    database.close()
  }
}
