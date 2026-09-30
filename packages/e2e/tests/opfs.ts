export const test = async (): Promise<void> => {
  const { assertEqual, createCacheWorker } = await import('./_helpers.ts')
  const cacheWorker = await createCacheWorker(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
  const name = `cache-worker-${crypto.randomUUID()}.txt`
  let text
  let traversalRejected = false
  try {
    await cacheWorker.writeFile(name, 'persistent text')
    text = await cacheWorker.readFile(name)
    await cacheWorker.removeFile(name)
    try {
      await cacheWorker.readFile('../outside.txt')
    } catch (error) {
      traversalRejected = error instanceof TypeError
    }
  } finally {
    try {
      await cacheWorker.removeFile(name)
    } catch {
      // The file may already have been removed by the scenario.
    }
    await cacheWorker.dispose()
  }
  assertEqual({ text, traversalRejected }, { text: 'persistent text', traversalRejected: true }, 'OPFS should enforce file access boundaries')
}
