//
//
//
import { VERBOSITY_LEVEL } from "@metal/logger"
//
import { z_T_IntPositive, z_TIpPort, z_TJson, z_TUrl } from "@metal/types"
import z from "zod"
import { z_U__server_authentication } from "../../auth/types/U__server_authentication"
import { HTTP_STATUS_MESSAGE } from "../@consts"
import { z_U__sources_source } from "./U__sources"

// v0.5
export const z_U__server_ai_engines_cors = z.object({
	"allowed-origins": z.string().default("*").optional(),
	"allowed-methods": z.string().default("GET,POST,OPTIONS").optional(),
	"allowed-headers": z.string().default("Origin, X-Requested-With, Content-Type, Accept, Authorization").optional(),
})

export const z_U__server_ai_engines = z.object({
	// contenizer
	params: z_TJson
		.optional(),
	"build-batch-size": z_T_IntPositive.min(1).max(10).default(5)
		.optional(),

	// endpoint
	"engines-url": z_TUrl.default("http://127.0.0.1:5000")
		.optional(),
	timeout: z_T_IntPositive.default(60_000)
		.optional(),
	sleep: z_T_IntPositive.min(5_000).max(600_000).default(5_000)
		.optional(),
	cors: z_U__server_ai_engines_cors.default(z_U__server_ai_engines_cors.parse({}))
		.optional(),

	// orchestrator
	"min-instance": z_T_IntPositive.min(1).default(1)
		.optional(),
	"max-instance": z_T_IntPositive.default(5)
		.optional(),
	"cpu-scale-up": z_T_IntPositive.min(10).max(100).default(70)
		.optional(),
	"cpu-scale-down": z_T_IntPositive.min(0).max(50).default(10)
		.optional(),
	"scale-interval": z_T_IntPositive.min(5_000).max(600_000).default(20_000)
		.optional(),
	"scale-down-grace-period": z_T_IntPositive.min(5_000).max(600_000).default(300_000)
		.optional(),

	// instance
	cpu: z_T_IntPositive.min(1).max(64).default(4).optional(),
	memory: z_T_IntPositive.min(1).max(128).default(2).optional(),
})

export const z_U__server_endpoints = z.object({
	"enable-mcp": z.boolean().default(false).optional(),
})

export const z_U__server_response_rate = z.object({
	windowMs: z_T_IntPositive.default(1 * 60 * 1000).optional(),
	max: z_T_IntPositive.default(600).optional(),
	message: z.string().default(HTTP_STATUS_MESSAGE.TOO_MANY_REQUESTS).optional(),
})

export const z_U__server = z.object({
	port: z_TIpPort.default(3000).optional(),
	verbosity: z
		.union([z.enum(VERBOSITY_LEVEL), z_T_IntPositive])
		.default(VERBOSITY_LEVEL.INFO)
		.optional(),
	timezone: z.string().default("UTC").optional(),
	cache: z_U__sources_source.optional(),
	authentication: z_U__server_authentication,
	"request-limit": z.string().default("10mb").optional(),
	"response-limit": z.string().default("10mb").optional(),
	"response-rate": z_U__server_response_rate.default(z_U__server_response_rate.parse({}))
		.optional(),
	"response-chunk": z.boolean().default(false)
		.optional(),
	"response-compression": z.boolean().default(true).optional(),
	"ai-engines": z_U__server_ai_engines.default(z_U__server_ai_engines.parse({}))
		.optional(),
	endpoints: z_U__server_endpoints.default(z_U__server_endpoints.parse({}))
		.optional(),
})

//
export type U__server_ai_engines_cors = z.infer<typeof z_U__server_ai_engines_cors>
export type U__server_ai_engines = z.infer<typeof z_U__server_ai_engines>
export type U__server_endpoints = z.infer<typeof z_U__server_endpoints>
export type U__server = z.infer<typeof z_U__server>
