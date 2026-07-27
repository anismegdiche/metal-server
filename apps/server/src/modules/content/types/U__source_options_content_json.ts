//
//
//
import z from "zod"
import { CONTENT } from "../@consts"


//
export const z_U__source_options_content_json = z.object({
    "content-type": z.literal(CONTENT.JSON),
    "json-path": z.string().optional(),
})


//
export type U__source_options_content_json = z.infer<typeof z_U__source_options_content_json>//