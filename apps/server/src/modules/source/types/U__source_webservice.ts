import { z_TUrl } from "@metal/types"
import { z } from "zod"
import { DATA_PROVIDER } from "../@consts"
import { z_U__source_webservice_options } from "./U__source_webservice_options"

export const z_U__source_webservice = z.object({
	provider: z.literal(DATA_PROVIDER.WEBSERVICE),
	host: z_TUrl,
	options: z_U__source_webservice_options,
})

export type U__source_webservice = z.infer<typeof z_U__source_webservice>
