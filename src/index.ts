//
//
//  Metal Server
//
import path from 'path';
import { fileURLToPath } from 'url';
//
import { AiBuilder } from "./modules/ai-engine/AiBuilder"
import { AiDocker } from "./modules/ai-engine/AiDocker"
import { ConfigManager } from "./modules/core/ConfigManager"
import { ConfigStore } from "./modules/core/ConfigStore"
import { ServerCore } from "./modules/core/ServerCore"
import { ServerEndpoint } from "./modules/core/ServerEndpoint"
import { ServerShutdown } from "./modules/core/ServerShutdown"
import { Logger } from "./utils/Logger"

// Current Path
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
ServerCore.IndexPath = __dirname

// params
const args = new Set(process.argv.slice(2))
const ARG_build_all_images = args.has("--build-all-images") || args.has("-bai")

// Setup graceful shutdown handlers
if (!ARG_build_all_images) ServerShutdown.SetupSignalHandlers()

if (ARG_build_all_images) {
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
		
		Logger.Info("✅ flushing log")
		await Logger.FlushQueue()
	})
