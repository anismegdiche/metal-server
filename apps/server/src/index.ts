//
//
//  Metal Server
//
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Logger } from "@metal/logger"
import { AiBuilder } from "./modules/ai-engine/AiBuilder"
import { AiDocker } from "./modules/ai-engine/AiDocker"
//
import { ApiKey } from "./modules/apikey/ApiKey"
import { ConfigManager } from "./modules/core/ConfigManager"
import { ConfigStore } from "./modules/core/ConfigStore"
import { ServerCore } from "./modules/core/ServerCore"
import { ServerEndpoint } from "./modules/core/ServerEndpoint"
import { ServerInitializer } from "./modules/core/ServerInitializer"
import { ServerShutdown } from "./modules/core/ServerShutdown"
import { Package } from "./utils/Package"

// Current Path
const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory
ServerCore.IndexPath = __dirname

// Change CWD to repo root so config/data paths resolve correctly
process.chdir(path.resolve(__dirname, "..", "..", ".."))

// params
const args = new Set(process.argv.slice(2))
const ARG_build_all_images = args.has("--build-all-images") || args.has("-bai")
const ARG_generate_api_key = args.has("--generate-api-key") || args.has("-gak")

// logging
const serviceName = Package.Json.name as string
Logger.Init(serviceName)

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

if (ARG_generate_api_key) {
	const userId = args.has("--user") ? ([...args][[...args].indexOf("--user") + 1] ?? "admin") : "admin"
	const keyName = args.has("--name") ? ([...args][[...args].indexOf("--name") + 1] ?? "generated") : "generated"

	const result = ApiKey.Create(userId, { name: keyName, scopes: ["*"] })

	console.log("\n┌──────────────────────────────────────────┐")
	console.log("│           API Key Generated               │")
	console.log("├──────────────────────────────────────────┤")
	console.log(`│  User:  ${userId}`)
	console.log(`│  Name:  ${keyName}`)
	console.log(`│  ID:    ${result.Body?.id}`)
	console.log("├──────────────────────────────────────────┤")
	console.log(`│  Key:   ${result.Body?.key}`)
	console.log("├──────────────────────────────────────────┤")
	console.log("│  ⚠  Save this key now. It won't be shown │")
	console.log("│     again.                                │")
	console.log("└──────────────────────────────────────────┘\n")

	process.exit(0)
}

// Initialize and start server
ServerCore.Init()
	.then(ServerEndpoint.Start)
	.catch((err) => {
		console.error(err)
	})
