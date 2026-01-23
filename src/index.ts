//
//
//  Metal Server
//
//
import { AiBuilder } from './modules/ai-engine/AiBuilder'
import { AiDocker } from "./modules/ai-engine/AiDocker"
import { ConfigManager } from "./modules/core/ConfigManager"
import { ConfigStore } from "./modules/core/ConfigStore"
import { ServerCore } from './modules/core/ServerCore'
import { ServerEndpoint } from './modules/core/ServerEndpoint'
import { ServerShutdown } from './modules/core/ServerShutdown'
import { Logger } from './utils/Logger'


// params
const args = process.argv.slice(2)
const isBuildImages = args.includes('--build-images') || args.includes('-bi')

// Setup graceful shutdown handlers
if (!isBuildImages)
    ServerShutdown.SetupSignalHandlers()


if (isBuildImages) {
    await ConfigManager.Init(new ConfigStore())
    ServerCore.InitLogging()
    Logger.Info(`${Logger.In} 🔨 Entering build mode`)
    await AiDocker.Init(true)

    //
    await AiBuilder.PrepareImages()
    Logger.Info(`${Logger.Out} 🔨 Exiting build mode`)
    Logger.Info(`${Logger.Out} 🔨 Flushing log`)
    await Logger.FlushQueue()
    process.exit(0)
}

// Initialize and start server
ServerCore.Init()
    .then(ServerEndpoint.Start)
    .catch(async () => {
        Logger.Info('✅ flushing log')
        await Logger.FlushQueue()
    })
