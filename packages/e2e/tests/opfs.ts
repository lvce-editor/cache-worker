export const test = async (): Promise<void> => {
  const { assertEqual, createRpc } = await import('./_helpers.ts')
  const rpc = await createRpc()
  const name = `cache-worker-${crypto.randomUUID()}.txt`
  let text
  let traversalRejected = false
  try {
    await rpc.invoke('Opfs.writeFile', name, 'persistent text')
    text = await rpc.invoke('Opfs.readFile', name)
    await rpc.invoke('Opfs.removeFile', name)
    try {
      await rpc.invoke('Opfs.readFile', '../outside.txt')
    } catch (error) {
      traversalRejected = error instanceof TypeError
    }
  } finally {
    try {
      await rpc.invoke('Opfs.removeFile', name)
    } catch {
      // The file may already have been removed by the scenario.
    }
    await rpc.dispose()
  }
  assertEqual({ text, traversalRejected }, { text: 'persistent text', traversalRejected: true }, 'OPFS should enforce file access boundaries')
}
