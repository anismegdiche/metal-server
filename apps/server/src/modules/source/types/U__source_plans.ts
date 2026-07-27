//
//
//
import z from "zod"
import { DATA_PROVIDER } from "../@consts"


//
export const z_U__source_plans = z.object({
	provider: z.literal(DATA_PROVIDER.PLANS).default(DATA_PROVIDER.PLANS),
	database: z.undefined().optional()
})


//
export type U__source_plans = z.infer<typeof z_U__source_plans>
