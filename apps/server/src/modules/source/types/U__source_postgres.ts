import { z_TIpPort } from "@metal/types"
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


export const z_U__source_postgres_options = z.object({
	connectionString: z.string()
		.optional(),
	ssl: z.any()
		.optional(),
	types: z.any()
		.optional(),
	statement_timeout: z.number()
		.optional(),
	query_timeout: z.number()
		.optional(),
	application_name: z.string()
		.optional(),
	connectionTimeoutMillis: z.number()
		.optional(),
	idle_in_transaction_session_timeout: z.number()
		.optional(),
	idleTimeoutMillis: z.number().default(10000)
		.optional(),
	max: z.number().default(10)
		.optional(),
	allowExitOnIdle: z.boolean().default(true)
		.optional(),
})

export const z_U__source_postgres = z.object({
	provider: z.literal(DATA_PROVIDER.POSTGRES).default(DATA_PROVIDER.POSTGRES),
	host: z.string(),
	port: z_TIpPort.default(5432)
		.optional(),
	user: z.string(),
	password: z.string(),
	database: z.string(),
	options: z_U__source_postgres_options
		.optional(),
})

export type U__source_postgres_options = z.infer<typeof z_U__source_postgres_options>
export type U__source_postgres = z.infer<typeof z_U__source_postgres>
