import { z } from "zod"
import { STORAGE } from "../@consts"

//


export const z_U__storage_azblob = z.object({
	"storage-type": z.literal(STORAGE.AZURE_BLOB).default(STORAGE.AZURE_BLOB),
	"connection-string": z.string(),
	container: z.string()
})


export type U__storage_azblob = z.infer<typeof z_U__storage_azblob>