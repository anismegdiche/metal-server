//
//
//
import { z_T_IntPositive } from "@metal/types"
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


//
export const z_U__source_mongodb_options = z.object({
	connectTimeoutMS: z_T_IntPositive.default(3000)
		.optional(),
	directConnection: z.boolean().default(false)
		.optional(),
	family: z.number()
		.optional(),
	forceServerObjectId: z.boolean().default(false)
		.optional(),
	ignoreUndefined: z.boolean().default(false)
		.optional(),
	keepAlive: z.boolean().default(true)
		.optional(),
	keepAliveInitialDelay: z_T_IntPositive.default(120000)
		.optional(),
	maxPoolSize: z_T_IntPositive.default(100)
		.optional(),
	maxIdleTimeMS: z_T_IntPositive
		.optional(),
	minPoolSize: z_T_IntPositive.default(0)
		.optional(),
	noDelay: z.boolean().default(true)
		.optional(),
	socketTimeoutMS: z_T_IntPositive.default(360000)
		.optional(),
	tls: z.boolean().default(false)
		.optional(),
	waitQueueTimeoutMS: z_T_IntPositive.default(0)
		.optional(),
})

export const z_U__source_mongodb = z.object({
	provider: z.literal(DATA_PROVIDER.MONGODB).default(DATA_PROVIDER.MONGODB),
	host: z.string(),
	database: z.string(),
	options: z_U__source_mongodb_options
		.optional(),
})


//
export type U__source_mongodb_options = z.infer<typeof z_U__source_mongodb_options>
export type U__source_mongodb = z.infer<typeof z_U__source_mongodb>
