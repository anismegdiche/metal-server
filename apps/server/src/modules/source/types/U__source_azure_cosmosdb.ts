//
//
//
import { z_T_IntPositive } from "@metal/types"
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


export const z_U__source_azure_cosmosdb_connection_policy = z.object({
	requestTimeout: z_T_IntPositive.default(5000)
		.optional(),
	connectionMode: z.literal("Gateway").default("Gateway")
		.optional(),
	maxRetryAttemptsOnThrottledRequests: z_T_IntPositive
		.optional(),
	maxRetryWaitTimeOnThrottledRequests: z_T_IntPositive
		.optional(),
	enableEndpointDiscovery: z.boolean()
		.optional(),
	preferredLocations: z.array(z.string())
		.optional(),
})

export const z_U__source_azure_cosmosdb_options = z.object({
	endpoint: z.string().default("")
		.optional(),
	key: z.string().default("")
		.optional(),
	partitionKey: z.string()
		.optional(),
	consistencyLevel: z.enum(["Strong", "BoundedStaleness", "Session", "Eventual", "ConsistentPrefix"]).default("Session")
		.optional(),
	connectionPolicy: z_U__source_azure_cosmosdb_connection_policy
		.optional(),
	retryAfter: z_T_IntPositive
		.optional(),
	autocreate: z.boolean().default(true)
		.optional(),
})

export const z_U__source_azure_cosmosdb = z.object({
	provider: z.literal(DATA_PROVIDER.AZURE_COSMOSDB).default(DATA_PROVIDER.AZURE_COSMOSDB),
	host: z.string().default(""),
	database: z.string(),
	options: z_U__source_azure_cosmosdb_options
		.optional(),
})

export type U__source_azure_cosmosdb_connection_policy = z.infer<typeof z_U__source_azure_cosmosdb_connection_policy>
export type U__source_azure_cosmosdb_options = z.infer<typeof z_U__source_azure_cosmosdb_options>
export type U__source_azure_cosmosdb = z.infer<typeof z_U__source_azure_cosmosdb>
