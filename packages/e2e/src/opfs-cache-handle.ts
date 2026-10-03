interface SyncHandle {
  close(): void
  flush(): void
  getSize(): number
  read(bytes: Uint8Array): number
  truncate(size: number): void
  write(bytes: Uint8Array): number
}

interface SyncFileHandle extends FileSystemFileHandle {
  createSyncAccessHandle(): Promise<SyncHandle>
}

export const test = async (): Promise<void> => {
  const { assertEqual, ModuleWorkerRpcParent, Randomization } = await import('./_helpers.ts')
  const namespace = `test-${Randomization.getRandomUUID()}`
  const rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: new URL('.tmp/cacheWorkerMain.js', import.meta.url).href })
  let access: SyncHandle | undefined
  let second: SyncHandle | undefined
  try {
    const firstHandle: SyncFileHandle = await rpc.invoke('Opfs.getCacheFileHandle', namespace, 'files-v1')
    const secondHandle: SyncFileHandle = await rpc.invoke('Opfs.getCacheFileHandle', namespace, 'files-v1')
    access = await firstHandle.createSyncAccessHandle()
    const content = new TextEncoder().encode('dependency contents 🌍')
    access.write(content)
    access.truncate(content.length)
    access.flush()
    let locked = false
    try {
      second = await secondHandle.createSyncAccessHandle()
    } catch {
      locked = true
    }
    assertEqual(locked, true, 'A second writer must not acquire the exclusive cache lock')
    access.close()
    access = undefined
    second = await secondHandle.createSyncAccessHandle()
    const bytes = new Uint8Array(second.getSize())
    second.read(bytes)
    assertEqual(new TextDecoder().decode(bytes), 'dependency contents 🌍', 'Cloned handles must preserve cache bytes after reopening')
    const other: SyncFileHandle = await rpc.invoke('Opfs.getCacheFileHandle', `${namespace}-other`, 'files-v1')
    const otherFile = await other.getFile()
    assertEqual(otherFile.size, 0, 'Namespaces must isolate cache data')
  } finally {
    second?.close()
    access?.close()
    await rpc.dispose()
    const root = await navigator.storage.getDirectory()
    const caches = await root.getDirectoryHandle('lvce-extension-caches')
    await caches.removeEntry(namespace, { recursive: true })
    try {
      await caches.removeEntry(`${namespace}-other`, { recursive: true })
    } catch {
      // An earlier assertion may have prevented creation of this namespace.
    }
  }
}
