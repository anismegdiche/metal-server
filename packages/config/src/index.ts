//
//
//
import { loadEnvFile } from 'node:process'

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

export function MetricsGetDataPath(): string {
    LoadEnv()
    return process.env.METRICS_DB_PATH
        ?? "/data/metrics"
}

export function MetricsGetTcpAddress(): string {
    LoadEnv()
    return process.env.METRICS_ADDRESS
        ?? "tcp://localhost:5555"
}


export function DataTablesGetDataPath(): string {
    LoadEnv()
    return process.env.DATATABLES_PATH
        ?? "/data/tables"
}


export function AiEnginesGetModelsPath(): string {
    LoadEnv()
    return process.env.AI_MODELS_PATH
        ?? "/data/models"
}