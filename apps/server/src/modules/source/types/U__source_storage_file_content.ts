//
//
//
import z from "zod"
import { CONTENT } from "../../content/@consts"
import { z_U__source_options_content } from "../../content/@types"


//
export const z_U__source_storage_file_content = z.record(
    z.string(),
    z
        .object({
            "content-type": z.enum(CONTENT),
        })
        .and(z_U__source_options_content)
)

//
export type U__source_storage_file_content = z.infer<typeof z_U__source_storage_file_content>