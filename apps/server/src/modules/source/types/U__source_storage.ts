import z from "zod"
import { DATA_PROVIDER } from "../@consts"
import { z_U__source_storage_files } from "./U__source_storage_files"
import { z_U__source_storage_folders } from "./U__source_storage_folders"

export const z_U__source_storage_options = z.union([
	z_U__source_storage_folders,
	z_U__source_storage_files,
])

export const z_U__source_storage = z.object({
	provider: z.literal(DATA_PROVIDER.STORAGE),
	options: z_U__source_storage_options,
})

export type U__source_storage_files_options = z.infer<typeof z_U__source_storage_files>
export type U__source_storage_options = z.infer<typeof z_U__source_storage_options>
export type U__source_storage = z.infer<typeof z_U__source_storage>
