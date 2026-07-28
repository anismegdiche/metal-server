import { z } from "zod"
import { STORAGE_TYPE } from "../@consts"

//


export const z_U__storage_azfs = z.object({
	"storage-type": z.literal(STORAGE_TYPE.AZURE_FILE).default(STORAGE_TYPE.AZURE_FILE),
	"connection-string": z.string(),
	"share-name": z.string(),
	folder: z.string().default("/")
		.optional(),
})

export type U__storage_azfs = z.infer<typeof z_U__storage_azfs>