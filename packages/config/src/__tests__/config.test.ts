//
//
//
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
    EnvApiKeysDataPath,
    EnvGetAiEnginesModelsPath,
    EnvGetDataTablesDataPath,
    EnvGetMetricsDataPath,
    EnvGetMetricsTcpAddress,
    EnvGetServerAddress,
    EnvGetStudioHost,
    EnvGetStudioPort,
    EnvLogsDataPath,
    EnvSessionsDataPath,
    LoadEnv,
} from "../index"
import { _MTR_ } from "../metrics"

//
const CONFIG_ENV_VARS = [
    "METRICS_DB_PATH",
    "METRICS_ADDRESS",
    "DATATABLES_PATH",
    "AI_MODELS_PATH",
    "API_KEYS_PATH",
    "LOGS_PATH",
    "SESSIONS_PATH",
    "SERVER_ADDRESS",
    "STUDIO_PORT",
    "STUDIO_HOST",
]

//
beforeEach(() => {
    for (const key of CONFIG_ENV_VARS) {
        delete process.env[key]
    }
})

//
afterEach(() => {
    vi.unstubAllEnvs()
})

//
describe("_MTR_", () => {
    it("exposes metric keys", () => {
        expect(_MTR_.SERVER_VERSION).toBe("server:version")
        expect(_MTR_.PLANS_TOTAL).toBe("plans:total")
        expect(_MTR_.HTTP_REQUESTS_5XX).toBe("http:requests:5xx")
        expect(_MTR_.HTTP_REQUESTS_AVG_DURATION).toBe("http:requests:avg_duration")
    })
})

//
describe("LoadEnv", () => {
    it("loads environment variables from a .env file", () => {
        const dir = mkdtempSync(join(tmpdir(), "metal-config-"))
        const envFile = join(dir, ".env")
        writeFileSync(envFile, "METRICS_DB_PATH=/loaded-from-file\n")
        try {
            LoadEnv(envFile)
            expect(process.env.METRICS_DB_PATH).toBe("/loaded-from-file")
        } finally {
            delete process.env.METRICS_DB_PATH
            rmSync(dir, { recursive: true, force: true })
        }
    })
})

//
describe("env getters", () => {
    it("returns the value from the environment when set", () => {
        vi.stubEnv("METRICS_DB_PATH", "/custom/metrics")
        vi.stubEnv("METRICS_ADDRESS", "tcp://localhost:9999")
        vi.stubEnv("DATATABLES_PATH", "/custom/tables")
        vi.stubEnv("AI_MODELS_PATH", "/custom/models")
        vi.stubEnv("API_KEYS_PATH", "/custom/api-keys")
        vi.stubEnv("LOGS_PATH", "/custom/logs")
        vi.stubEnv("SESSIONS_PATH", "/custom/sessions")
        vi.stubEnv("SERVER_ADDRESS", "https://example.com:8080")
        vi.stubEnv("STUDIO_PORT", "7000")
        vi.stubEnv("STUDIO_HOST", "127.0.0.1")

        expect(EnvGetMetricsDataPath()).toBe("/custom/metrics")
        expect(EnvGetMetricsTcpAddress()).toBe("tcp://localhost:9999")
        expect(EnvGetDataTablesDataPath()).toBe("/custom/tables")
        expect(EnvGetAiEnginesModelsPath()).toBe("/custom/models")
        expect(EnvApiKeysDataPath()).toBe("/custom/api-keys")
        expect(EnvLogsDataPath()).toBe("/custom/logs")
        expect(EnvSessionsDataPath()).toBe("/custom/sessions")
        expect(EnvGetServerAddress()).toBe("https://example.com:8080")
        expect(EnvGetStudioPort()).toBe("7000")
        expect(EnvGetStudioHost()).toBe("127.0.0.1")
    })

    it("returns the default when the environment variable is not set", () => {
        expect(EnvGetMetricsDataPath()).toBe("./data/metrics")
        expect(EnvGetMetricsTcpAddress()).toBe("tcp://localhost:5555")
        expect(EnvGetDataTablesDataPath()).toBe("./data/tables")
        expect(EnvGetAiEnginesModelsPath()).toBe("./data/models")
        expect(EnvApiKeysDataPath()).toBe("./data/api-keys")
        expect(EnvLogsDataPath()).toBe("./data/logs")
        expect(EnvSessionsDataPath()).toBe("./data/sessions")
        expect(EnvGetServerAddress()).toBe("http://localhost:3000")
        expect(EnvGetStudioPort()).toBe("5000")
        expect(EnvGetStudioHost()).toBe("0.0.0.0")
    })
})
