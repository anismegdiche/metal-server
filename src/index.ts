//
//
//  Metal Server
//
//
import { ServerCore } from './modules/core/ServerCore'
import { ServerEndpoint } from './modules/core/ServerEndpoint'
import { Logger } from './utils/Logger'

ServerCore.Init()
    .then(ServerEndpoint.Start)
    .catch(error => Logger.Error(error))
