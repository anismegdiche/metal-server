//
//
//  Metal Server
//
import path from "node:path"
import { fileURLToPath } from "node:url"
//
import { AiBuilder } from "./modules/ai-engine/AiBuilder"
import { AiDocker } from "./modules/ai-engine/AiDocker"
import { ConfigManager } from "./modules/core/ConfigManager"
import { ConfigStore } from "./modules/core/ConfigStore"
import { ServerCore } from "./modules/core/ServerCore"
import { ServerEndpoint } from "./modules/core/ServerEndpoint"
import { ServerInitializer } from "./modules/core/ServerInitializer"
import { ServerShutdown } from "./modules/core/ServerShutdown"
import { Logger } from "./utils/Logger"

// Current Path
const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory
ServerCore.IndexPath = __dirname

// Change CWD to repo root so config/data paths resolve correctly
process.chdir(path.resolve(__dirname, "..", "..", ".."))

// params
const args = new Set(process.argv.slice(2))
const ARG_build_all_images = args.has("--build-all-images") || args.has("-bai")

// Setup graceful shutdown handlers
if (!ARG_build_all_images) ServerShutdown.SetupSignalHandlers()

if (ARG_build_all_images) {
	await ConfigManager.Init(new ConfigStore())
	ServerInitializer.InitLogging()
	Logger.Info(`${Logger.In} 🔨 Entering build mode`)
	await AiDocker.Init(true)

	//
	await AiBuilder.PrepareImages()
	Logger.Info(`${Logger.Out} 🔨 Exiting build mode`)
	process.exit(0)
}

// Initialize and start server
ServerCore.Init()
	.then(ServerEndpoint.Start)
	.catch((err) => {
		console.error(err)
	})
