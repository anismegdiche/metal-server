//
//
//
import { existsSync, readdirSync } from "node:fs"
import os from "node:os"
import { pathToFileURL } from "node:url"
//
import { Logger } from "../../utils/Logger"
import { StringUtils } from "../../utils/StringUtils"
import { ROUTE } from "./@consts"
import { ResponseHandler } from "./ResponseHandler"
import { ServerRouter } from "./routes/ServerRouter"
import { ServerEndpoint } from "./ServerEndpoint"
import { ServerInitializer } from "./ServerInitializer"


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
		await ServerInitializer.InitAll()

		ServerCore.RegisterServerMiddleware()
		await ServerCore.LoadModuleHooks()

		ServerEndpoint.InitApi()
		ServerInitializer.StartWatcher()
	}

	@Logger.LogFunction()
	static async Shutdown(): Promise<void> {
		Logger.Info("Server shutdown initiated")

		// TODO: Add proper cleanup for other components

		Logger.Info("Server shutdown completed")
	}
}
