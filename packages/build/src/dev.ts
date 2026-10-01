import { spawn, type ChildProcess } from 'node:child_process'
import { root } from './root.ts'

let activeProcess: ChildProcess | undefined
let receivedSignal: NodeJS.Signals | undefined

const forwardSignal = (signal: NodeJS.Signals): void => {
  receivedSignal = signal
  activeProcess?.kill(signal)
}

process.on('SIGINT', forwardSignal)
process.on('SIGTERM', forwardSignal)

const run = (args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: 'inherit',
    })
    activeProcess = child
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      activeProcess = undefined
      if (receivedSignal) {
        process.exitCode = receivedSignal === 'SIGINT' ? 130 : 143
        resolve()
        return
      }
      if (signal) {
        reject(new Error(`Process exited with signal ${signal}`))
        return
      }
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`))
        return
      }
      resolve()
    })
  })
}

try {
  await run(['packages/build/src/build.ts'])
  if (!receivedSignal) {
    await run(['packages/server/src/server.ts', '--test-path=packages/e2e'])
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
