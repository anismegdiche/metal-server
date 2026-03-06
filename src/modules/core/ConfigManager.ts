//
//
//

import * as Fs from "node:fs"
import * as dotenv from "dotenv"
import * as Yaml from "js-yaml"
import { has, merge } from "lodash-es"
//
import { Assert } from "../../utils/Assert"
import { JsonUtils } from "../../utils/JsonUtils"
import { LOGGER_DEFAULT_LEVEL, Logger } from "../../utils/Logger"
import { TypeUtils } from "../../utils/TypeUtils"
import { AUTH_PROVIDER } from "../auth/@consts"
import { ConfigFileError } from "../errors/HttpErrors"
import { HTTP_STATUS_MESSAGE } from "./@consts"
import type { IConfigStore } from "./base/IConfigStore"
import type { U_config } from "./types/U_config"
import { z_U_config } from "./types/U_config"

//
export class ConfigManager {
	static ConfigFilePath = "./config/config.yml"
	static EnvFilePath = "./config/.env"
	static configStore?: IConfigStore
	static DEFAULT = <U_config>{
		server: {
			port: 3000,
			timezone: "UTC",
			verbosity: LOGGER_DEFAULT_LEVEL,
			authentication: {
				provider: AUTH_PROVIDER.LOCAL,
			},
			"request-limit": "10mb",
			"response-limit": "10mb",
			"response-rate": {
				windowMs: 1 * 60 * 1000,
				max: 600,
				message: HTTP_STATUS_MESSAGE.TOO_MANY_REQUESTS,
			},
			"response-chunk": false,
			"ai-engines": {
				params: undefined, //{ socketPath: '/var/run/docker.sock' }
				"build-batch-size": 5,
				"engines-url": "http://127.0.0.1:5000",
				timeout: 60_000,
				sleep: 5_000,
				cors: {
					"allowed-origins": "*",
					"allowed-methods": "GET,POST,OPTIONS",
					"allowed-headers": "Content-Type,Authorization,X-Requested-With",
				},
				"min-instance": 1,
				"max-instance": 5,
				"cpu-scale-up": 70,
				"cpu-scale-down": 10,
				"scale-interval": 20_000,
				"scale-down-grace-period": 300_000,
				cpu: 4,
				memory: 2,
			},
		},
	}

	@Logger.LogFunction()
	static async Init(configStore: IConfigStore): Promise<void> {
		const configFileContent = await ConfigManager.Load()
		const newConfig = await ConfigManager.Validate(merge(ConfigManager.DEFAULT, configFileContent))
		// Config.CheckRessourcesUsage(newConfig)
		ConfigManager.configStore ??= configStore

		ConfigManager.configStore.Init(newConfig)
	}

	@Logger.LogFunction()
	static async Load(): Promise<U_config> {
		dotenv.config({ path: ConfigManager.EnvFilePath })
		const configFileRaw = Fs.readFileSync(ConfigManager.ConfigFilePath, "utf8")
		const configInterpol = configFileRaw.replaceAll(/\$(?:{([^{}]*)})/g, (match, envVarName) => {
			return process.env[envVarName] ?? match
		})

		return Yaml.load(configInterpol) as U_config
	}

	// @Logger.LogFunction(Logger.Debug, true)
	// static CheckRessourcesUsage(newConfig: TConfig): void {
	//     // TODO check for used sources and plans in config
	//     const sourceConfig = {
	//         type: "string",

	//         enum: _.keys(newConfig?.sources ?? [])
	//     }

	//     const planConfig = {
	//         type: "string",

	//         enum: _.keys(newConfig?.plans ?? [])
	//     }
	// }

	@Logger.LogFunction(true)
	static async Validate(newConfig: U_config): Promise<U_config> {
		const result = z_U_config.safeParse(newConfig)
		TypeUtils.Validate(result, new ConfigFileError("Configuration file errors found"))
		return result.data as U_config
	}

	// static GetErrors(schemaErrors: any): string[] {
	//     return schemaErrors
	//         .filter((e: Error) => e.message.includes('is required') || e.message.includes('must be'))
	// }

	@Logger.LogFunction()
	static Save(): void {
		Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
		const configFileRaw = Yaml.dump(ConfigManager.configStore.Configuration)
		Fs.writeFileSync(ConfigManager.ConfigFilePath, configFileRaw)
	}

	@Logger.LogFunction()
	static Has(path: string): boolean {
		Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
		return has(ConfigManager.configStore.Configuration, path)
	}

	@Logger.LogFunction()
	static Get<T>(path: string): T {
		Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
		return JsonUtils.Get<T>(ConfigManager.configStore.Configuration, path)
	}

	@Logger.LogFunction()
	static Set<T>(path: string, value: T): void {
		Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
		JsonUtils.Set(ConfigManager.configStore.Configuration, path, value)
	}
}
