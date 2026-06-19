//
//
//
import { loadEnvFile } from 'node:process'


//
let _EnvLoaded = false


//
export function LoadEnv(path: string = './.env') {
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
    LoadEnv("./.env")
    return process.env.METRICS_DB_PATH
        ?? "/data/metrics"
}

export function MetricsGetTcpAddress(): string {
    LoadEnv("./.env")
    return process.env.METRICS_ADDRESS
        ?? "tcp://localhost:5555"
}


export function DataTablesGetDataPath(): string {
    LoadEnv("./.env")
    return process.env.DATATABLES_PATH
        ?? "/data/tables"
}


export function AiEnginesGetModelsPath(): string {
    LoadEnv("./.env")
    return process.env.AI_MODELS_PATH
        ?? "/data/models"
}