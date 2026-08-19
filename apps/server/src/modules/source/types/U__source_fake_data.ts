//
//
//
import z from "zod"
import { DATA_PROVIDER } from "../@consts"

//
const z_fake_data_entity = z.object({
	locale: z.string().default("en_US").optional(),
	rows: z.number().int().min(0).default(100).optional(),
	fields: z.record(z.string(), z.string()).optional(),
})

export const z_U__source_fake_data_options = z.object({
	seed: z.number().int().optional(),
	autocreate: z.boolean().default(true).optional(),
	entities: z.record(z.string(), z_fake_data_entity),
})

export const z_U__source_fake_data = z.object({
	provider: z.literal(DATA_PROVIDER.FAKE_DATA).default(DATA_PROVIDER.FAKE_DATA),
	options: z_U__source_fake_data_options,
})

//
export type U__source_fake_data_entity = z.infer<typeof z_fake_data_entity>
export type U__source_fake_data_options = z.infer<typeof z_U__source_fake_data_options>
export type U__source_fake_data = z.infer<typeof z_U__source_fake_data>
