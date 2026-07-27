//
//
//
import { z_TIpPort } from "@metal/types"
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


//
export const z_U__source_mysql_options = z.object({
	waitForConnections: z.boolean().default(true)
		.optional(),
	connectionLimit: z.number().default(10)
		.optional(),
	maxIdle: z.number().default(10)
		.optional(),
	idleTimeout: z.number().default(60000)
		.optional(),
	queueLimit: z.number().default(0)
		.optional(),
	enableKeepAlive: z.boolean().default(true)
		.optional(),
	keepAliveInitialDelay: z.number().default(0)
		.optional(),
})

export const z_U__source_mysql = z.object({
	provider: z.literal(DATA_PROVIDER.MYSQL).default(DATA_PROVIDER.MYSQL),
	host: z.string().default("127.0.0.1"),
	port: z_TIpPort.default(3306)
		.optional(),
	user: z.string(),
	password: z.string(),
	database: z.string(),
	options: z_U__source_mysql_options
		.optional(),
})


//
export type U__source_mysql_options = z.infer<typeof z_U__source_mysql_options>
export type U__source_mysql = z.infer<typeof z_U__source_mysql>
