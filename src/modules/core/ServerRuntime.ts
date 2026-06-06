
//
//
//
import type { FSWatcher } from "chokidar"
import chokidar from "chokidar"
//
import type { TJson } from "../../types/TJson"
import { Logger } from "../../utils/Logger"
import { AiDocker } from "../ai-engine/AiDocker"
import { AiEngine } from "../ai-engine/AiEngine"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { Cache } from "../cache/Cache"
import { PlansManager } from "../plan/PlansManager"
import { Schedule } from "../plan/Schedule"
import { Schema } from "../schema/Schema"
import { DataProvider } from "../source/DataProvider"
import { Source } from "../source/Source"
import { SERVER } from "./@consts"
import { ConfigManager } from "./ConfigManager"
import { ConfigStore } from "./ConfigStore"
import { HttpResponse } from "./HttpResponse"
import { ServerShutdown } from "./ServerShutdown"
import type { TInternalResponse } from "./types/TInternalResponse"

//
export class ServerRuntime {
	private static configWatcher?: FSWatcher

	@Logger.LogFunction()
	static async Stop(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		const { ServerShutdown } = await import("./ServerShutdown")
		await ServerShutdown.Shutdown("MANUAL_STOP")

		return HttpResponse.Ok({
			message: "Server stopped",
		})
	}

	@Logger.LogFunction()
	static async Reload(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		if (userToken) Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		Logger.Info(`${Logger.In} Reloading server configuration...`)

		// Stop all active components
		AiDocker.StopScaler()
		Schedule.StopAll()
		await Cache.Disconnect()
		await Source.DisconnectAll()

		// Clear module states
		PlansManager.Clear()
		AiEngine.Clear()
		DataProvider.Clear()

		// Reload configuration from disk and re-validate
		await ConfigManager.Init(new ConfigStore())

		const { ServerCore } = await import("./ServerCore")
		ServerCore.InitLogging()

		// Re-initialize all modules in correct order (similar to ServerCore.Init)
		await Source.Init()
		await Cache.Init(DataProvider.GetProvider)
		await Cache.Connect()
		Schema.Init(Cache.Get)
		await AiEngine.Init()
		await PlansManager.Init()
		await Schedule.Init()
		await ServerCore.InitAuthentication()
		ServerCore.InitResponse()

		Logger.Info(`${Logger.Out} Server configuration reloaded successfully`)

		return HttpResponse.Ok({
			message: `Server reloaded`,
		})
	}

	@Logger.LogFunction()
	static async ReloadPlans(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		if (userToken) Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		await PlansManager.Reload()

		return HttpResponse.Ok({
			message: `Plans and schedules reloaded successfully`,
		})
	}

	@Logger.LogFunction()
	static async GetInfo(): Promise<TInternalResponse<TJson>> {
		return HttpResponse.Ok({
			server: SERVER.NAME,
			version: SERVER.VERSION,
		})
	}

	@Logger.LogFunction()
	static StartWatcher(): void {
		// Config
		ServerRuntime.configWatcher = chokidar.watch(ConfigManager.ConfigFilePath).on("change", () => {
			Logger.Info("Config file changed. Reloading...")
			ServerRuntime.Reload().catch((err: Error) => Logger.Error(err.message))
		})

		// Register watcher for shutdown
		ServerShutdown.RegisterConfigWatcher(ServerRuntime.configWatcher)
	}
}
