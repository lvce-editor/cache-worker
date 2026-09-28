import { WebWorkerRpcClient2 } from '@lvce-editor/rpc'
import * as CommandMap from '../CommandMap/CommandMap.js'

export const listen = async () => {
  await WebWorkerRpcClient2.create({ commandMap: CommandMap.commandMap })
}
