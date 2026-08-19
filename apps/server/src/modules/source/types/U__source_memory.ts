//
//
//
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


export const z_U__source_memory_options = z.object({
	autocreate: z.boolean().default(true)
		.optional(),
})

export const z_U__source_memory = z.object({
	provider: z.literal(DATA_PROVIDER.MEMORY).default(DATA_PROVIDER.MEMORY),
	options: z_U__source_memory_options
		.optional(),
})


//
export type U__source_memory_options = z.infer<typeof z_U__source_memory_options>
export type U__source_memory = z.infer<typeof z_U__source_memory>
