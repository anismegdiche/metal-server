//
//
//
import z from "zod"
import { z_T_IntPositive } from "@metal/types"
//
import { z_TIpPort } from "@metal/types"
import { z_TJson } from "@metal/types"
import { z_TUrl } from "@metal/types"
import { z_U__server_authentication } from "../../auth/types/U__server_authentication"
import { z_U__sources_source } from "./U__sources"

// v0.5
export const z_U__server_ai_engines_cors = z.object({
	"allowed-origins": z.string().optional(),
	"allowed-methods": z.string().optional(),
	"allowed-headers": z.string().optional(),
})

export const z_U__server_ai_engines = z.object({
	// contenizer
	params: z_TJson.optional(),
	"build-batch-size": z_T_IntPositive.min(1).max(10).optional(),

	// endpoint
	"engines-url": z_TUrl.optional(),
	timeout: z_T_IntPositive.optional(),
	sleep: z_T_IntPositive.min(5_000).max(600_000).optional(),
	cors: z_U__server_ai_engines_cors.optional(),

	// orchestrator
	"min-instance": z_T_IntPositive.min(1).optional(),
	"max-instance": z_T_IntPositive.optional(),
	"cpu-scale-up": z_T_IntPositive.min(10).max(100).optional(),
	"cpu-scale-down": z_T_IntPositive.min(0).max(50).optional(),
	"scale-interval": z_T_IntPositive.min(5_000).max(600_000).optional(),
	"scale-down-grace-period": z_T_IntPositive.min(5_000).max(600_000).optional(),

	// instance
	cpu: z_T_IntPositive.min(1).max(64).optional(),
	memory: z_T_IntPositive.min(1).max(128).optional(),
})

export const z_U__server_endpoints = z.object({
	"enable-mcp": z.boolean().default(false).optional(),
})

export const z_U__server = z.object({
	port: z_TIpPort.optional(),
	verbosity: z.union([z.string(), z_T_IntPositive]).optional(),
	timezone: z.string().optional(),
	cache: z_U__sources_source.optional(),
	authentication: z_U__server_authentication,
	"request-limit": z.string().optional(),
	"response-limit": z.string().optional(),
	"response-rate": z
		.object({
			windowMs: z_T_IntPositive.optional(),
			max: z_T_IntPositive.optional(),
			message: z.string().optional(),
		})
		.optional(),
	"response-chunk": z.boolean().optional(),
	"ai-engines": z_U__server_ai_engines.optional(),
	endpoints: z_U__server_endpoints.optional(),
})

//
export type U__server_ai_engines_cors = z.infer<typeof z_U__server_ai_engines_cors>
export type U__server_ai_engines = z.infer<typeof z_U__server_ai_engines>
export type U__server_endpoints = z.infer<typeof z_U__server_endpoints>
export type U__server = z.infer<typeof z_U__server>
