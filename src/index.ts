//
//
//  Metal Server
//
//
import { Logger } from './lib/Logger'
import { Server } from './server/Server'

Server.Init()
    .then(Server.Start)
    .catch(error => Logger.Error(error))