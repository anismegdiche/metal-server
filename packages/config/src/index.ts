//
//
//
import { loadEnvFile } from 'node:process'
import { _MTR_ } from './metrics'

//
export {
    _MTR_
}

//
const ENV_PATH = "../../.env"

//
let _EnvLoaded = false

//
export function LoadEnv(path: string = ENV_PATH): void {
    try {
        if (_EnvLoaded)
            return

        loadEnvFile(path)
        _EnvLoaded = true
    } catch {
        //
    }
}

export function EnvGetMetricsDataPath(): string {
    LoadEnv()
    return process.env.METRICS_DB_PATH ?? "./data/metrics"
}

export function EnvGetMetricsTcpAddress(): string {
    LoadEnv()
    return process.env.METRICS_ADDRESS ?? "tcp://localhost:5555"
}

export function EnvGetDataTablesDataPath(): string {
    LoadEnv()
    return process.env.DATATABLES_PATH ?? "./data/tables"
}

export function EnvGetAiEnginesModelsPath(): string {
    LoadEnv()
    return process.env.AI_MODELS_PATH ?? "./data/models"
}

export function EnvApiKeysDataPath(): string {
    LoadEnv()
    return process.env.API_KEYS_PATH ?? "./data/api-keys"
}

export function EnvLogsDataPath(): string {
    LoadEnv()
    return process.env.LOGS_PATH ?? "./data/logs"
}

export function EnvSessionsDataPath(): string {
    LoadEnv()
    return process.env.SESSIONS_PATH ?? "./data/sessions"
}

export function EnvGetServerAddress(): string {
    LoadEnv()
    return process.env.SERVER_ADDRESS ?? "http://localhost:3000"
}