import { openDB } from 'idb'

type DatabaseKey = string | number | Readonly<Date> | Readonly<ArrayBuffer> | Readonly<ArrayBufferView<ArrayBuffer>> | readonly DatabaseKey[]
type DatabaseUpgrade = Readonly<{
  objectStoreNames: Readonly<Pick<DOMStringList, 'contains'>>
  createObjectStore: (name: string) => unknown
}>

const cloneDatabaseKey = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- IndexedDB accepts mutable binary values; clone keys before handing them to the browser API.
  key: DatabaseKey,
): IDBValidKey => structuredClone(key) as IDBValidKey

const closeDatabaseWhenOpened = async (opening: Readonly<Promise<Awaited<ReturnType<typeof openDB>>>>): Promise<void> => {
  try {
    const openedDatabase = await opening
    openedDatabase.close()
  } catch {
    // The open request can also fail after reporting that it was blocked.
  }
}

const openDatabase = async (name: string): Promise<Awaited<ReturnType<typeof openDB>>> => {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this context')
  }
  let database: Awaited<ReturnType<typeof openDB>> | undefined
  const { promise: blocked, reject: rejectBlocked } = Promise.withResolvers<never>()
  const opening = openDB(name, 1, {
    blocked() {
      rejectBlocked(new Error(`Opening IndexedDB database "${name}" was blocked`))
    },
    blocking() {
      database?.close()
    },
    upgrade(database: DatabaseUpgrade) {
      if (!database.objectStoreNames.contains('file-handles')) {
        database.createObjectStore('file-handles')
      }
    },
  })
  try {
    const openedDatabase = await Promise.race([opening, blocked])
    database = openedDatabase
    return openedDatabase
  } catch (error) {
    void closeDatabaseWhenOpened(opening)
    throw error
  }
}

export const addIndexedDbFileHandle = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Preserve all IndexedDB key kinds; clone keys before handing them to the browser API.
  key: DatabaseKey,
  handle: unknown,
  databaseName = 'lvce-cache-worker',
): Promise<void> => {
  const database = await openDatabase(databaseName)
  const transaction = database.transaction('file-handles', 'readwrite')
  try {
    await transaction.store.put(handle, cloneDatabaseKey(key))
    await transaction.done
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transaction.done
    } catch {
      // The transaction has already aborted.
    }
    throw error
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
  try {
    const value = await transaction.store.get(cloneDatabaseKey(key))
    await transaction.done
    return value
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transaction.done
    } catch {
      // The transaction has already aborted.
    }
    throw error
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
  try {
    await transaction.store.delete(cloneDatabaseKey(key))
    await transaction.done
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transaction.done
    } catch {
      // The transaction has already aborted.
    }
    throw error
  } finally {
    database.close()
  }
}
