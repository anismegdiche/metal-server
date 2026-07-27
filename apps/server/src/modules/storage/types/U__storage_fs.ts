import { z } from "zod"
import { STORAGE } from "../@consts"

//


export const z_U__storage_fs = z.object({
	"storage-type": z.literal(STORAGE.FILESYSTEM).default(STORAGE.FILESYSTEM),
	folder: z.string(),
})

export type U__storage_fs = z.infer<typeof z_U__storage_fs> 