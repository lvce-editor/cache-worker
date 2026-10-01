import { MessagePortRpcClient, WebWorkerRpcClient2 } from '@lvce-editor/rpc'
import * as CommandMap from '../CommandMap/CommandMap.ts'

export const listen = async (): Promise<void> => {
  await WebWorkerRpcClient2.create({ commandMap: CommandMap.commandMap })
}

export const handleMessagePort = async (messagePort: MessagePort): Promise<void> => {
  await MessagePortRpcClient.create({
    commandMap: CommandMap.commandMap,
    messagePort,
  })
}

export const initialize = async (type: string, messagePort: MessagePort): Promise<void> => {
  if (type !== 'message-port') {
    throw new Error(`unsupported initialize type ${type}`)
  }
  await handleMessagePort(messagePort)
}
