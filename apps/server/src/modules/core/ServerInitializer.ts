//
//
//

import { Logger } from "@metal/logger"
import type { FSWatcher } from "chokidar"
import chokidar from "chokidar"
import type { LogLevelDesc } from "loglevel"
//
import { Convert } from "../../utils/Convert"
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
import { ConfigManager } from "./ConfigManager"
import { ConfigStore } from "./ConfigStore"
import { ServerShutdown } from "./ServerShutdown"

//
export class ServerInitializer {
	private static configWatcher?: FSWatcher

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

	@Logger.LogFunction()
	static async InitAll(): Promise<void> {
		await ConfigManager.Init(new ConfigStore())
		ServerInitializer.InitLogging()
		await Source.Init()
		await Cache.Init(DataProvider.GetProvider)
		await Cache.Connect()
		Schema.Init(Cache.Get)
		await AiEngine.Init()
		await PlansManager.Init()
		await Schedule.Init()
		await ServerInitializer.InitAuthentication()
		ServerInitializer.InitResponse()
	}

	@Logger.LogFunction()
	static StartWatcher(): void {
		ServerInitializer.configWatcher = chokidar
			.watch(ConfigManager.ConfigFilePath)
			.on("change", () => {
				Logger.Info(Logger.In, "Config file changed. Reloading...")
				import("./ServerRuntime").then(({ ServerRuntime }) =>
					ServerRuntime.Reload()
						.catch((err: Error) => Logger.Error(err.message)),
				)
			})

		ServerShutdown.RegisterConfigWatcher(ServerInitializer.configWatcher)
	}
}
