//
//
//

import { Logger } from "@metal/logger"
import type { TJson } from "@metal/types"
import { AiDocker } from "../ai-engine/AiDocker"
import { AiEngine } from "../ai-engine/AiEngine"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { Cache } from "../cache/Cache"
import { PlansManager } from "../plan/PlansManager"
import { Schedule } from "../plan/Schedule"
import { DataProvider } from "../source/DataProvider"
import { Source } from "../source/Source"
import { SERVER } from "./@consts"
import { HttpResponse } from "./HttpResponse"
import { ServerInitializer } from "./ServerInitializer"
import type { TInternalResponse } from "./types/TInternalResponse"

//
export class ServerRuntime {
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

		// Re-initialize all modules
		await ServerInitializer.InitAll()

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
}
