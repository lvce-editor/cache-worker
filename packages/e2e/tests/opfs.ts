import type { Test } from '@lvce-editor/test-with-playwright'

export const test: Test = async ({ CacheWorker, Randomization }) => {
  const { assertEqual } = await import('./_helpers.ts')
  const cacheWorker = await CacheWorker.create(new URL('.tmp/cacheWorkerMain.js', import.meta.url))
  const name = `cache-worker-${Randomization.getRandomUUID()}.txt`
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
