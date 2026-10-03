import { afterEach, expect, jest, test } from '@jest/globals'
import { getCacheFileHandle } from '../src/parts/Opfs/Opfs.ts'

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

afterEach(() => {
  if (originalNavigator) {
    Object.defineProperty(globalThis, 'navigator', originalNavigator)
  } else {
    // Node normally provides navigator; remove the test property if it did not.
    // @ts-expect-error -- navigator is optional in the test environment.
    delete globalThis.navigator
  }
})

test.each(['', '.', '..', '../outside', 'a/b', 'a\\b', 'UPPER', '-prefix', 'a'.repeat(81)])(
  'rejects invalid cache components before touching storage: %s',
  async (invalid) => {
    const getDirectory = jest.fn()
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { storage: { getDirectory } } })
    await expect(getCacheFileHandle(invalid, 'files-v1')).rejects.toThrow('OPFS cache namespace and name')
    await expect(getCacheFileHandle('typescript', invalid)).rejects.toThrow('OPFS cache namespace and name')
    expect(getDirectory).not.toHaveBeenCalled()
  },
)

test('returns the cloneable file handle without opening or locking it', async () => {
  const handle = { createSyncAccessHandle: jest.fn() }
  const getFileHandle = jest.fn<(name: string, options: { readonly create: boolean }) => Promise<typeof handle>>(async () => handle)
  const getNamespace = jest.fn<(name: string, options: { readonly create: boolean }) => Promise<{ getFileHandle: typeof getFileHandle }>>(
    async () => ({
      getFileHandle,
    }),
  )
  const getCaches = jest.fn<(name: string, options: { readonly create: boolean }) => Promise<{ getDirectoryHandle: typeof getNamespace }>>(
    async () => ({
      getDirectoryHandle: getNamespace,
    }),
  )
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { storage: { getDirectory: async () => ({ getDirectoryHandle: getCaches }) } },
  })
  expect(await getCacheFileHandle('typescript', 'node-modules-v1')).toBe(handle)
  expect(getCaches).toHaveBeenCalledWith('lvce-extension-caches', { create: true })
  expect(getNamespace).toHaveBeenCalledWith('typescript', { create: true })
  expect(getFileHandle).toHaveBeenCalledWith('node-modules-v1', { create: true })
  expect(handle.createSyncAccessHandle).not.toHaveBeenCalled()
})

test('propagates storage failures for the caller to fall back', async () => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      storage: {
        getDirectory: async () => {
          throw new Error('quota or permission')
        },
      },
    },
  })
  await expect(getCacheFileHandle('typescript', 'files-v1')).rejects.toThrow('quota or permission')
})
