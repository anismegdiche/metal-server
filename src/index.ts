//
//
//  Metal Server
//
//
import { Logger } from './utils/Logger'
import { Server } from './server/Server'

Server.Init()
    .then(Server.Start)
    .catch(error => Logger.Error(error))