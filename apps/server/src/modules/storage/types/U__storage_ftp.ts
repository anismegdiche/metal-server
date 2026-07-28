import { z_TIpPort } from "@metal/types"
import { z } from "zod"
import { STORAGE_TYPE } from "../@consts"

//


export const z_U__storage_ftp = z.object({
	"storage-type": z.literal(STORAGE_TYPE.FTP).default(STORAGE_TYPE.FTP),
	host: z.string(),
	port: z_TIpPort.default(21)
		.optional(),
	user: z.string(),
	password: z.string(),
	secure: z.boolean().default(false)
		.optional(),
	folder: z.string().default("/")
		.optional(),
})

export type U__storage_ftp = z.infer<typeof z_U__storage_ftp> 