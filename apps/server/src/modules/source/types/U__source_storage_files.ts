import z from "zod"
import { z_U__source_options_content } from "../../content/types/U__source_options_content"
import { z_U__storage } from "../../storage/types/U__storage"
import { STORAGE_MODE } from "../STORAGE_MODE"

//
export const z_U__source_storage_files_content = z.record(z.string(), z_U__source_options_content)

export const z_U__source_storage_files = z.object({
    "storage-mode": z.literal(STORAGE_MODE.FILES).default(STORAGE_MODE.FILES),
    content: z_U__source_storage_files_content,
    autocreate: z.boolean()
        .optional(),
}).and(z_U__storage)

//
export type U__source_storage_files_content = z.infer<typeof z_U__source_storage_files_content>
export type U__source_storage_files = z.infer<typeof z_U__source_storage_files>

////////////////
