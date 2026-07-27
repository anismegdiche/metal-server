//
//
//
import { z_TUrl } from "@metal/types"
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


//
export const z_U__source_metal = z.object({
	provider: z.literal(DATA_PROVIDER.METAL).default(DATA_PROVIDER.METAL),
	host: z_TUrl,
	user: z.string(),
	password: z.string(),
	database: z.string(),
})


//
export type U__source_metal = z.infer<typeof z_U__source_metal>
