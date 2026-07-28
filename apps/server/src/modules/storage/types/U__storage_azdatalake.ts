import z from "zod"
import { STORAGE_TYPE } from "../@consts"

//

export const z_U__storage_azdatalake = z.object({
	"storage-type": z.literal(STORAGE_TYPE.AZURE_DATALAKE_G2).default(STORAGE_TYPE.AZURE_DATALAKE_G2),
	"connection-string": z.string(),
	container: z.string(),
})



export type U__storage_azdatalake = z.infer<typeof z_U__storage_azdatalake>