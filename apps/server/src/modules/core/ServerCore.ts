//
//
//
import { existsSync, readdirSync } from "node:fs"
import os from "node:os"
import { pathToFileURL } from "node:url"
import { _MTR_ } from "@metal/config"
import { Logger } from "@metal/logger"
//
import { StringUtils } from "@metal/utils"
import { MetricsCollector } from "../metrics/MetricsCollector"
import { ROUTE, SERVER } from "./@consts"
import { ResponseHandler } from "./ResponseHandler"
import { ServerRouter } from "./routes/ServerRouter"
import { ServerEndpoint } from "./ServerEndpoint"
import { ServerInitializer } from "./ServerInitializer"

//
export class ServerCore {
	static IndexPath: string
	static CwdPath: string
	static WorkspacePath: string 
	static readonly Cpus = os.cpus().length ?? 1
	static readonly Memory = os.freemem()
	static readonly Platform = process.platform

	@Logger.LogFunction()
	static RegisterServerMiddleware(): void {
		ServerEndpoint.RegisterMiddleware(() => {
			Logger.Info(Logger.In, 'Enabling route', ROUTE.API_SERVER_PATH)
			ServerEndpoint.Api.use(`${ROUTE.API_SERVER_PATH}/`, Logger.RequestMiddleware, ResponseHandler.SetContentJson, ServerRouter)
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
			const hookPath = existsSync(hookJs) ? hookJs : hookTs

			if (!existsSync(hookPath)) continue

			try {
				const hookModule = await import(pathToFileURL(hookPath).href)
				if (hookModule.RegisterMiddleware && typeof hookModule.RegisterMiddleware === "function") {
					Logger.Info(Logger.In, `Loading hook for module:`, moduleName)
					hookModule.RegisterMiddleware()
				}
			} catch (e) {
				Logger.Error(Logger.Out, `Failed to load hook for module '${moduleName}':`, e)
			}
		}
	}

	@Logger.LogFunction()
	static ResetMetrics(): void {
		MetricsCollector.Clear()
		MetricsCollector.DispatchEvent_set(_MTR_.SERVER_VERSION, SERVER.VERSION)
		MetricsCollector.DispatchEvent_set(_MTR_.SERVER_UPTIME, Date.now())
		MetricsCollector.DispatchEvent_set(_MTR_.HTTP_REQUESTS_TOTAL, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.HTTP_REQUESTS_ACTIVE, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.HTTP_REQUESTS_2XX, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.HTTP_REQUESTS_3XX, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.HTTP_REQUESTS_4XX, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.HTTP_REQUESTS_5XX, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.HTTP_REQUESTS_AVG_DURATION, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.SOURCES_TOTAL, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.SOURCES_ACTIVE, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.SOURCES_DETAILS, [])
		MetricsCollector.DispatchEvent_set(_MTR_.SCHEDULES_TOTAL, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.SCHEDULES_DETAILS, {})
	}

	@Logger.LogFunction()
	static async Init(): Promise<void> {

		ServerCore.ResetMetrics()

		await ServerInitializer.InitAll()

		ServerCore.RegisterServerMiddleware()
		await ServerCore.LoadModuleHooks()

		ServerEndpoint.InitApi()
		ServerInitializer.StartWatcher()

		let lastCpuUsage = process.cpuUsage()
		const metricsIntervalMs = 5000
		setInterval(() => {
			const cpuUsageDelta = process.cpuUsage(lastCpuUsage)
			lastCpuUsage = process.cpuUsage()
			const cpuUsagePercent = ((cpuUsageDelta.user + cpuUsageDelta.system) / (metricsIntervalMs * 1000 * ServerCore.Cpus)) * 100

			MetricsCollector.DispatchEvent_set(_MTR_.SERVER_MEMORY_USAGE, process.memoryUsage().heapUsed)
			MetricsCollector.DispatchEvent_set(_MTR_.SERVER_CPU_USAGE, Number(cpuUsagePercent.toFixed(2)))
		}, metricsIntervalMs)
	}

	@Logger.LogFunction()
	static async Shutdown(): Promise<void> {
		Logger.Info("Server shutdown initiated")

		// TODO: Add proper cleanup for other components

		Logger.Info("Server shutdown completed")
	}
}
