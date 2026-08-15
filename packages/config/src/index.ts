//
//
//
import { loadEnvFile } from "node:process"
import { StringUtils } from "@metal/utils"
import { _MTR_ } from "./_MTR_"


//
export { _MTR_ }

export type T_Env = {
	server: {
		config: {
			path: string
		}
		metrics: {
			path: string
		}
		dataTables: {
			path: string
		}
		aiModels: {
			path: string
		}
		apiKeys: {
			path: string
		}
		sessions: {
			path: string
		}
	}
	studio: {
		host: string
		port: string
	}
	logger: {
		path: string
	}
	metricServer: {
		address: string
	}
}
//
export const ENV_PATH = "../../.env"

export const CONFIG_PATH = "./config/config.yml"

export enum ENV {
	// server
	SERVER_METRICS_DB_PATH = "./data/metrics",
	SERVER_DATATABLES_PATH = "./data/tables",
	SERVER_AI_MODELS_PATH = "./data/models",
	SERVER_API_KEYS_PATH = "./data/api-keys",
	SERVER_SESSIONS_PATH = "./data/sessions",

	// studio
	STUDIO_PORT = "5000",
	STUDIO_HOST = "0.0.0.0",
	STUDIO_SERVER_ADDRESS = "http://localhost:3000",

	// common
	LOGGER_LOGS_PATH = "./data/logs",

	// unused
	METRIC_METRICS_ADDRESS = "tcp://localhost:5555",
}

export var Env: T_Env

let _EnvLoaded = false

//
export function LoadEnv(path: string = ENV_PATH): void {
	try {
		if (_EnvLoaded) return

		loadEnvFile(path)
	} catch (e: unknown) {
		console.error(`❌  Failed to load environment variables from ${path}`, (e as Error).message)
	}
	_EnvLoaded = true
}

export function EnvGetMetricsDataPath(): string {
	LoadEnv()
	return process.env.METRICS_DB_PATH ?? ENV.SERVER_METRICS_DB_PATH
}

export function EnvGetMetricsTcpAddress(): string {
	LoadEnv()
	return process.env.METRICS_ADDRESS ?? ENV.METRIC_METRICS_ADDRESS
}

export function EnvGetDataTablesDataPath(): string {
	LoadEnv()
	return process.env.DATATABLES_PATH ?? ENV.SERVER_DATATABLES_PATH
}

export function EnvGetAiEnginesModelsPath(): string {
	LoadEnv()
	return process.env.AI_MODELS_PATH ?? ENV.SERVER_AI_MODELS_PATH
}

export function EnvApiKeysDataPath(): string {
	LoadEnv()
	return process.env.API_KEYS_PATH ?? ENV.SERVER_API_KEYS_PATH
}

export function EnvLogsDataPath(): string {
	LoadEnv()
	return process.env.LOGS_PATH ?? ENV.LOGGER_LOGS_PATH
}

export function EnvSessionsDataPath(): string {
	LoadEnv()
	return process.env.SESSIONS_PATH ?? ENV.SERVER_SESSIONS_PATH
}

export function EnvGetServerAddress(): string {
	LoadEnv()
	return process.env.SERVER_ADDRESS ?? ENV.STUDIO_SERVER_ADDRESS
}

export function EnvGetStudioPort(): string {
	LoadEnv()
	return process.env.STUDIO_PORT ?? ENV.STUDIO_PORT
}

export function EnvGetStudioHost(): string {
	LoadEnv()
	return process.env.STUDIO_HOST ?? ENV.STUDIO_HOST
}

export function EnvInit(path: string) {
	Env = {
		server: {
			config: {
				path: StringUtils.FsPath(path, CONFIG_PATH),
			},
			metrics: {
				path: StringUtils.FsPath(path, EnvGetMetricsDataPath()),
			},
			dataTables: {
				path: StringUtils.FsPath(path, EnvGetDataTablesDataPath()),
			},
			aiModels: {
				path: StringUtils.FsPath(path, EnvGetAiEnginesModelsPath()),
			},
			apiKeys: {
				path: StringUtils.FsPath(path, EnvApiKeysDataPath()),
			},
			sessions: {
				path: StringUtils.FsPath(path, EnvSessionsDataPath()),
			},
		},
		studio: {
			host: ENV.STUDIO_HOST,
			port: ENV.STUDIO_PORT,
		},
		logger: {
			path: StringUtils.FsPath(path, EnvLogsDataPath()),
		},
		metricServer: {
			address: ENV.METRIC_METRICS_ADDRESS
		}
	}
}
