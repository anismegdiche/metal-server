//
//
//
import z from "zod"
//
import { z_TIpPort } from "../../../types/TIpPort"
import { z_TJson } from "../../../types/TJson"
import { DATA_PROVIDER } from "../../source/@consts"

//
export const z_U__sources_source_options = z.record(
	z.string(),
	z.union([
		z.string(),
		z.number(),
		z_TJson,
		z.boolean()
	]),
)

export const z_U__sources_source = z.object({
	provider: z.enum(DATA_PROVIDER),
	database: z.string()
		.optional(),
	host: z.string()
		.optional(),
	port: z_TIpPort
		.optional(),
	user: z.string()
		.optional(),
	password: z.string()
		.optional(),
	options: z_U__sources_source_options
		.optional(),
})

export const z_U__sources = z.record(
	z.string(),
	z_U__sources_source
)

//
export type U__sources_source_options = z.infer<typeof z_U__sources_source_options>
export type U__sources_source = z.infer<typeof z_U__sources_source>
export type U__sources = z.infer<typeof z_U__sources>
