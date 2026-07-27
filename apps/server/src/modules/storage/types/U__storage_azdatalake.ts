import z from "zod"
import { STORAGE } from "../@consts"

//

export const z_U__storage_azdatalake = z.object({
	"storage-type": z.literal(STORAGE.AZURE_DATALAKE_G2).default(STORAGE.AZURE_DATALAKE_G2),
	"connection-string": z.string(),
	container: z.string(),
})



export type U__storage_azdatalake = z.infer<typeof z_U__storage_azdatalake>