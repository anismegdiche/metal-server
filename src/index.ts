//
//
//  Metal Server
//
//
import { Server } from './server/Server'
import { Logger } from './utils/Logger'

Server.Init()
    .then(Server.Start)
    .catch(error => Logger.Error(error))
