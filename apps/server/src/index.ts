//
//
//  Metal Server
//

import path from "node:path"
import { fileURLToPath } from "node:url"
import { Env, EnvInit } from "@metal/config"
import { Logger } from "@metal/logger"
import { StringUtils } from "@metal/utils"
import { ArgumentParser } from "argparse"
import chalk from "chalk"
import * as Yaml from "js-yaml"
import { AiBuilder } from "./modules/ai-engine/AiBuilder"
import { AiDocker } from "./modules/ai-engine/AiDocker"
import { ApiKey } from "./modules/apikey/ApiKey"
import { ConfigManager } from "./modules/core/ConfigManager"
import { ConfigStore } from "./modules/core/ConfigStore"
import { ServerCore } from "./modules/core/ServerCore"
import { ServerEndpoint } from "./modules/core/ServerEndpoint"
import { ServerInitializer } from "./modules/core/ServerInitializer"
import { ServerShutdown } from "./modules/core/ServerShutdown"
import { z_U_config } from "./modules/core/types/U_config"
import { DataTable } from "./types/DataTable"
import { Package } from "./utils/Package"

//
interface TCliArgs {
	buildAllImages: boolean
	generateApiKey: boolean
	defaultConfig: boolean
	config: boolean
	user: string
	name: string
}

//

function _createParser(): ArgumentParser {
	const parser = new ArgumentParser({
		prog: "yarn server:start",
		description: `Metal server v${Package.Json.version}`,
		color: true,
	})

	parser.add_argument("-v", "--version", {
		action: "version",
		version: `v${Package.Json.version}`,
	})

	const modes = parser.add_mutually_exclusive_group()

	modes.add_argument("-bai", "--build-ai-images", {
		action: "store_true",
		dest: "buildAllImages",
		help: "build AI engine Docker images and exit",
	})

	modes.add_argument("-gak", "--generate-api-key", {
		action: "store_true",
		dest: "generateApiKey",
		help: "generate an API key and exit",
	})

	modes.add_argument("-dc", "--default-config", {
		action: "store_true",
		dest: "defaultConfig",
		help: "print the default config and exit",
	})

	modes.add_argument("-c", "--config", {
		action: "store_true",
		dest: "config",
		help: "print the merged user config with defaults and exit",
	})

	parser.add_argument("--user", {
		default: "admin",
		help: "user the generated API key belongs to",
	})

	parser.add_argument("--name", {
		default: "generated",
		help: "name of the generated API key",
	})

	return parser
}
//
// ── One-off commands ───────────────────────────────────────────────────────
//
async function _buildAllImages(): Promise<void> {
	await ConfigManager.Init(new ConfigStore())
	ServerInitializer.InitLogging()
	Logger.Info(`${Logger.In} 🔨 Entering build mode`)
	await AiDocker.Init(true)
	await AiBuilder.PrepareImages()
	Logger.Info(`${Logger.Out} 🔨 Exiting build mode`)
}

function _generateApiKey(userId: string, keyName: string): void {
	const result = ApiKey.Create(userId, { name: keyName, scopes: ["*"] })

	console.log()
	console.log(chalk.green.bold("🔑  API Key Generated"))
	console.log()

	console.log(chalk.gray("User      "), userId)
	console.log(chalk.gray("Name      "), keyName)
	console.log(chalk.gray("ID        "), result.Body?.id)

	console.log()
	console.log(chalk.yellow("Secret Key"))
	console.log(chalk.white.bold(result.Body?.key))

	console.log()
	console.log(chalk.yellow("⚠️   Save this key now. It will not be shown again."))
	console.log()
}

function _getDefaultConfig(): void {
	console.log()
	console.log(chalk.green.bold("📄 Default Config"))
	console.log()

	console.log(Yaml.dump(z_U_config.parse({})))
	console.log()
}

async function _getConfig(): Promise<void> {
	await ConfigManager.Init(new ConfigStore())
	console.log()
	console.log(chalk.green.bold("📄 Merged Config"))
	console.log()

	console.log(Yaml.dump(ConfigManager.configStore?.Configuration))
	console.log()
}

//
async function main() {
	//
	// ── Path setup ─────────────────────────────────────────────────────────────
	//
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	ServerCore.IndexPath = __dirname
	ServerCore.CwdPath = process.cwd()
	ServerCore.WorkspacePath = StringUtils.FsPath(ServerCore.CwdPath, "..", "..")

	// Env init
	EnvInit(ServerCore.WorkspacePath)

	// Datatable init
	DataTable.Path = Env.server.dataTables.path

	console.log(chalk.yellow.bold(`ℹ️  node execPath path  = ${process.execPath}`))
	console.log(chalk.yellow.bold(`ℹ️  node workspace path = ${ServerCore.WorkspacePath}`))
	console.log(chalk.yellow.bold(`ℹ️  node cwd path       = ${ServerCore.CwdPath}`))
	console.log(chalk.yellow.bold(`ℹ️  index path          = ${ServerCore.IndexPath}`))

	//
	// ── CLI ────────────────────────────────────────────────────────────────────
	//

	const args = _createParser().parse_args<TCliArgs>()

	//
	// ── Logging ────────────────────────────────────────────────────────────────
	//
	await Logger.Init(Package.Json.name as string)

	if (!args.buildAllImages) ServerShutdown.SetupSignalHandlers()

	//
	// ── Dispatch ───────────────────────────────────────────────────────────────
	//

	if (args.buildAllImages) {
		await _buildAllImages()
		process.exit(0)
	}

	if (args.generateApiKey) {
		_generateApiKey(args.user, args.name)
		process.exit(0)
	}

	if (args.defaultConfig) {
		_getDefaultConfig()
		process.exit(0)
	}

	if (args.config) {
		await _getConfig()
		process.exit(0)
	}

	// Initialize and start server
	ServerCore.Init()
		.then(ServerEndpoint.Start)
		.catch((err) => {
			console.error(err)
		})
}

main()
