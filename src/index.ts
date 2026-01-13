//
//
//  Metal Server
//
//
import { ServerCore } from './modules/core/ServerCore'
import { ServerEndpoint } from './modules/core/ServerEndpoint'
import { ServerShutdown } from './modules/core/ServerShutdown'
import { Logger } from './utils/Logger'

// Setup graceful shutdown handlers
ServerShutdown.SetupSignalHandlers()

// Initialize and start server
ServerCore.Init()
    .then(ServerEndpoint.Start)
    .catch(async () => {
        Logger.Info('✅ flushing log')
        await Logger.FlushQueue()
    })
