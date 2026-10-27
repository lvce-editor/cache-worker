export const test = async (): Promise<void> => {
  const { assertEqual, createCacheWorkerRpc } = await import('./_helpers.ts')
  const cacheWorker = await createCacheWorkerRpc(new URL('assets/cacheWorkerMain.js', import.meta.url))
  const name = `cache-worker-${crypto.randomUUID()}.txt`
  let text
  let traversalRejected = false
  try {
    await cacheWorker.invoke('Opfs.writeFile', name, 'persistent text')
    text = await cacheWorker.invoke('Opfs.readFile', name)
    await cacheWorker.invoke('Opfs.removeFile', name)
    try {
      await cacheWorker.invoke('Opfs.readFile', '../outside.txt')
    } catch (error) {
      traversalRejected = error instanceof TypeError
    }
  } finally {
    try {
      await cacheWorker.invoke('Opfs.removeFile', name)
    } catch {
      // The file may already have been removed by the scenario.
    }
    await cacheWorker.dispose()
  }
  assertEqual({ text, traversalRejected }, { text: 'persistent text', traversalRejected: true }, 'OPFS should enforce file access boundaries')
}
