const getRoot = async () => {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.getDirectory !== 'function') {
    throw new Error('Origin Private File System is not available in this context')
  }
  return navigator.storage.getDirectory()
}

const validateName = (name) => {
  if (typeof name !== 'string' || name.length === 0 || name === '.' || name === '..' || /[/\\]/.test(name)) {
    throw new TypeError('OPFS filename must be a non-empty single path component')
  }
}

export const readFile = async (name) => {
  validateName(name)
  const root = await getRoot()
  const handle = await root.getFileHandle(name)
  return (await handle.getFile()).text()
}

export const writeFile = async (name, content) => {
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

export const removeFile = async (name) => {
  validateName(name)
  const root = await getRoot()
  await root.removeEntry(name)
}
