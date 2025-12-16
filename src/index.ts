//
//
//  Metal Server
//
//
import { ServerCore } from './modules/core/ServerCore'
import { ServerEndpoint } from './modules/core/ServerEndpoint'
import { TJson } from './types/TJson'
import { Logger } from './utils/Logger'
import { JsonUtils } from './utils/JsonUtils'

ServerCore.Init()
    .then(ServerEndpoint.Start)
    .catch((error: unknown) => Logger.Error(JsonUtils.ToTextList(error as TJson)))
