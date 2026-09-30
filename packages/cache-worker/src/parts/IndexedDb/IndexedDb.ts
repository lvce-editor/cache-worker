type DatabaseKey = string | number | Readonly<Date> | Readonly<ArrayBuffer> | Readonly<ArrayBufferView<ArrayBuffer>> | readonly DatabaseKey[]

const cloneDatabaseKey = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- IDBValidKey permits mutable binary values; clone before passing them to IndexedDB.
  key: DatabaseKey,
): IDBValidKey => structuredClone(key) as IDBValidKey

const requestResult = <T>(
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- IDBRequest is consumed through read-only members and event listeners.
  request: Readonly<Pick<IDBRequest<T>, 'addEventListener' | 'error' | 'result'>>,
): Promise<T> => {
  const { promise, reject, resolve } = Promise.withResolvers<T>()
  try {
    request.addEventListener('success', (): void => resolve(request.result), { once: true })
    request.addEventListener('error', (): void => reject(request.error ?? new Error('IndexedDB request failed')), { once: true })
  } catch (error) {
    reject(error)
  }
  return promise
}

const transactionDone = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- IDBTransaction is observed through events and its error value.
  transaction: Readonly<Pick<IDBTransaction, 'addEventListener' | 'error'>>,
): Promise<void> => {
  const { promise, reject, resolve } = Promise.withResolvers<void>()
  try {
    transaction.addEventListener('complete', (): void => resolve(undefined), { once: true })
    transaction.addEventListener('abort', (): void => reject(transaction.error ?? new Error('IndexedDB transaction aborted')), { once: true })
    transaction.addEventListener('error', (): void => reject(transaction.error ?? new Error('IndexedDB transaction failed')), { once: true })
  } catch (error) {
    reject(error)
  }
  return promise
}

const openDatabase = (name: string): Promise<IDBDatabase> => {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this context')
  }
  const { promise, reject, resolve } = Promise.withResolvers<IDBDatabase>()
  try {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = (): void => {
      if (!request.result.objectStoreNames.contains('file-handles')) {
        request.result.createObjectStore('file-handles')
      }
    }
    request.onsuccess = (): void => {
      request.result.onversionchange = (): void => request.result.close()
      resolve(request.result)
    }
    request.onerror = (): void => reject(request.error ?? new Error('Failed to open IndexedDB database'))
    request.onblocked = (): void => reject(new Error(`Opening IndexedDB database "${name}" was blocked`))
  } catch (error) {
    reject(error)
  }
  return promise
}

export const addIndexedDbFileHandle = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Preserve all IndexedDB key kinds; clone keys before handing them to the browser API.
  key: DatabaseKey,
  handle: unknown,
  databaseName = 'lvce-cache-worker',
): Promise<void> => {
  const database = await openDatabase(databaseName)
  const transaction = database.transaction('file-handles', 'readwrite')
  const done = transactionDone(transaction)
  const request = transaction.objectStore('file-handles').put(handle, cloneDatabaseKey(key))
  try {
    await Promise.all([requestResult(request), done])
  } finally {
    database.close()
  }
}

export const getIndexedDbFileHandle = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Preserve all IndexedDB key kinds; clone keys before handing them to the browser API.
  key: DatabaseKey,
  databaseName = 'lvce-cache-worker',
): Promise<unknown> => {
  const database = await openDatabase(databaseName)
  const transaction = database.transaction('file-handles', 'readonly')
  const done = transactionDone(transaction)
  try {
    const value = await requestResult(transaction.objectStore('file-handles').get(cloneDatabaseKey(key)))
    await done
    return value
  } finally {
    database.close()
  }
}

export const removeIndexedDbFileHandle = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Preserve all IndexedDB key kinds; clone keys before handing them to the browser API.
  key: DatabaseKey,
  databaseName = 'lvce-cache-worker',
): Promise<void> => {
  const database = await openDatabase(databaseName)
  const transaction = database.transaction('file-handles', 'readwrite')
  const done = transactionDone(transaction)
  const request = transaction.objectStore('file-handles').delete(cloneDatabaseKey(key))
  try {
    await Promise.all([requestResult(request), done])
  } finally {
    database.close()
  }
}
