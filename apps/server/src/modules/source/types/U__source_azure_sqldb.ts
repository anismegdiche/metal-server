//
//
//
import { z_T_IntPositive, z_TIpPort } from "@metal/types"
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


//
export const z_U__source_azure_sqldb_options = z.object({
	domain: z.string()
		.optional(),
	connectionTimeout: z_T_IntPositive.default(15000)
		.optional(),
	requestTimeout: z_T_IntPositive.default(15000)
		.optional(),
	stream: z.boolean()
		.optional(),
	parseJSON: z.boolean()
		.optional(),
	arrayRowMode: z.string()
		.optional(),
	encrypt: z.boolean()
		.optional(),
	trustServerCertificate: z.boolean()
		.optional(),
})

export const z_U__source_azure_sqldb = z.object({
	provider: z.literal(DATA_PROVIDER.AZURE_SQLDB).default(DATA_PROVIDER.AZURE_SQLDB),
	host: z.string(),
	port: z_TIpPort.default(1433)
		.optional(),
	user: z.string(),
	password: z.string(),
	database: z.string(),
	options: z_U__source_azure_sqldb_options
		.optional(),
})

export type U__source_azure_sqldb_options = z.infer<typeof z_U__source_azure_sqldb_options>
export type U__source_azure_sqldb = z.infer<typeof z_U__source_azure_sqldb>
