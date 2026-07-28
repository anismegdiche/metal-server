import { z_TIpPort } from "@metal/types"
import { z } from "zod"
import { STORAGE_TYPE } from "../@consts"

//


export const z_U__storage_sftp = z.object({
	"storage-type": z.literal(STORAGE_TYPE.SFTP).default(STORAGE_TYPE.SFTP),
	host: z.string(),
	port: z_TIpPort.default(22)
		.optional(),
	user: z.string(),
	password: z.string(),
	"private-key": z.string()
		.optional(),
	passphrase: z.string()
		.optional(),
	folder: z.string().default("/")
		.optional(),
})

export type U__storage_sftp = z.infer<typeof z_U__storage_sftp>