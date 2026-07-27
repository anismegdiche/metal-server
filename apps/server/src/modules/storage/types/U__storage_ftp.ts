import { z_TIpPort } from "@metal/types"
import { z } from "zod"
import { STORAGE } from "../@consts"

//


export const z_U__storage_ftp = z.object({
	"storage-type": z.literal(STORAGE.FTP).default(STORAGE.FTP),
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