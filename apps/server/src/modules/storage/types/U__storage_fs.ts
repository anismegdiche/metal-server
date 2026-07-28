import { z } from "zod"
import { STORAGE_TYPE } from "../@consts"

//


export const z_U__storage_fs = z.object({
	"storage-type": z.literal(STORAGE_TYPE.FILESYSTEM).default(STORAGE_TYPE.FILESYSTEM),
	folder: z.string(),
})

export type U__storage_fs = z.infer<typeof z_U__storage_fs> 