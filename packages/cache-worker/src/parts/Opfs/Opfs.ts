const getRoot = async (): Promise<FileSystemDirectoryHandle> => {
  if (typeof navigator === 'undefined') {
    throw new TypeError('Origin Private File System is not available in this context')
  }
  const { storage } = navigator
  if (typeof storage.getDirectory !== 'function') {
    throw new TypeError('Origin Private File System is not available in this context')
  }
  return storage.getDirectory()
}

const validateName = (name: string): void => {
  if (typeof name !== 'string' || name.length === 0 || name === '.' || name === '..' || /[/\\]/.test(name)) {
    throw new TypeError('OPFS filename must be a non-empty single path component')
  }
}

export const readFile = async (name: string): Promise<string> => {
  validateName(name)
  const root = await getRoot()
  const handle = await root.getFileHandle(name)
  const file = await handle.getFile()
  return file.text()
}

export const writeFile = async (
  name: string,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Preserve all chunks accepted by FileSystemWritableFileStream.write.
  content: FileSystemWriteChunkType,
): Promise<void> => {
  validateName(name)
  const root = await getRoot()
  const handle = await root.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  try {
    await writable.write(content)
  } catch (error) {
    await writable.abort()
    throw error
  }
  await writable.close()
}

export const removeFile = async (name: string): Promise<void> => {
  validateName(name)
  const root = await getRoot()
  await root.removeEntry(name)
}
