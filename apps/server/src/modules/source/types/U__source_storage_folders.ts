import z from "zod"
import { z_U__storage } from "../../storage/types/U__storage"
import { STORAGE_MODE } from "../providers/STORAGE_MODE"


//
export const z_U__source_storage_folders = z.object({
	"storage-mode": z.literal(STORAGE_MODE.FOLDERS).default(STORAGE_MODE.FOLDERS),
	autocreate: z.boolean().default(false)
		.optional(),
	"allow-delete": z.boolean().default(false)
		.optional(),
	"folders-pattern": z.string().default("*.*")
		.optional(),
	"files-pattern": z.string().default("*.*")
		.optional(),
}).and(z_U__storage)


//
export type U__source_storage_folders = z.infer<typeof z_U__source_storage_folders>
