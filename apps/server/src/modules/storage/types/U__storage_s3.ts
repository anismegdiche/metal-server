import z from "zod"
import { STORAGE } from "../@consts"

//


export const z_U__storage_s3 = z.object({
	"storage-type": z.literal(STORAGE.AWS_S3).default(STORAGE.AWS_S3),
	bucket: z.string(),
	region: z.string(),
	"access-key-id": z.string()
		.optional(),
	"secret-access-key": z.string()
		.optional(),
	endpoint: z.string()
		.optional(),
	profile: z.string()
		.optional(),
	autocreate: z.boolean()
		.optional(),
})


export type U__storage_s3 = z.infer<typeof z_U__storage_s3>