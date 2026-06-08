//
//
//

import { existsSync, readdirSync } from "node:fs"
import os from "node:os"
import { pathToFileURL } from "node:url"
import type { LogLevelDesc } from "loglevel"
//
import { Convert } from "../../utils/Convert"
import { Logger } from "../../utils/Logger"
import { StringUtils } from "../../utils/StringUtils"
import { AiEngine } from "../ai-engine/AiEngine"
import { AuthProvider } from "../auth/AuthProvider"
import { Roles } from "../auth/Roles"
import type { U__server_authentication } from "../auth/types/U__server_authentication"
import { Cache } from "../cache/Cache"
import { PlansManager } from "../plan/PlansManager"
import { Schedule } from "../plan/Schedule"
import { Schema } from "../schema/Schema"
import { DataProvider } from "../source/DataProvider"
import { Source } from "../source/Source"
import { ROUTE } from "./@consts"
import { ConfigManager } from "./ConfigManager"
import { ConfigStore } from "./ConfigStore"
import { ResponseHandler } from "./ResponseHandler"
import { ServerRouter } from "./routes/ServerRouter"
import { ServerEndpoint } from "./ServerEndpoint"
import { ServerRuntime } from "./ServerRuntime"

//
export class ServerCore {
	static readonly NodeJsProcessPath = process.cwd()
	static IndexPath = process.cwd()
	static readonly Cpus = os.cpus().length ?? 1
	static readonly Memory = os.freemem()
	static readonly Platform = process.platform

	static RegisterServerMiddleware(): void {
		ServerEndpoint.RegisterMiddleware(() => {
			Logger.Info(`Route: Enabling API, URL= ${ROUTE.SERVER_PATH}`)
			ServerEndpoint.Api.use(`${ROUTE.SERVER_PATH}/`, ResponseHandler.SetContentJson, ServerRouter)
		})
	}

	@Logger.LogFunction()
	static async LoadModuleHooks(): Promise<void> {
		const modulesPath = StringUtils.FsPath(ServerCore.IndexPath, "modules")
		const moduleDirs = readdirSync(modulesPath, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name)

		for (const moduleName of moduleDirs) {
			const hookJs = StringUtils.FsPath(modulesPath, moduleName, "_hook.js")
			const hookTs = StringUtils.FsPath(modulesPath, moduleName, "_hook.ts")
			const hookPath = existsSync(hookJs)
				? hookJs
				: hookTs

			if (!existsSync(hookPath))
				continue

			try {
				const hookModule = await import(pathToFileURL(hookPath).href)
				if (hookModule.RegisterMiddleware && typeof hookModule.RegisterMiddleware === "function") {
					Logger.Info(`Loading hook for module: ${moduleName}`)
					hookModule.RegisterMiddleware()
				}
			} catch (e) {
				Logger.Warn(`Failed to load hook for module '${moduleName}': ${e instanceof Error ? e.message : String(e)}`)
			}
		}
	}

	@Logger.LogFunction()
	static async Init(): Promise<void> {
		// core
		// ServerCore.RegisterProviders()

		// config
		await ConfigManager.Init(new ConfigStore())
		ServerCore.InitLogging()

		// sources
		await Source.Init()

		// cache
		await Cache.Init(DataProvider.GetProvider)
		await Cache.Connect()

		// schema
		Schema.Init(Cache.Get)

		// AI
		await AiEngine.Init()

		// plans
		await PlansManager.Init()
		await Schedule.Init()

		await ServerCore.InitAuthentication()

		ServerCore.InitResponse()

		// Register server middleware
		ServerCore.RegisterServerMiddleware()

		// Load module hooks dynamically
		await ServerCore.LoadModuleHooks()

		ServerEndpoint.InitApi()
		ServerRuntime.StartWatcher()
	}

	@Logger.LogFunction()
	static async Shutdown(): Promise<void> {
		Logger.Info("Server shutdown initiated")

		// TODO: Add proper cleanup for other components

		Logger.Info("Server shutdown completed")
	}

	@Logger.LogFunction()
	static InitLogging(): void {
		const verbosity = ConfigManager.Get<LogLevelDesc>("server.verbosity")
		Logger.SetLevel(verbosity)
	}

	@Logger.LogFunction()
	static async InitAuthentication(): Promise<void> {
		const authentication = ConfigManager.Get<U__server_authentication>("server.authentication")
		await AuthProvider.SetCurrent(authentication.provider)
		AuthProvider.Provider.Init()
		Roles.Init()
	}

	@Logger.LogFunction()
	static InitResponse(): void {
		Logger.Debug(`Server Response Limit set to ${Convert.HumainSizeToBytes(ConfigManager.Get("server.response-limit"))}`)
	}
}
