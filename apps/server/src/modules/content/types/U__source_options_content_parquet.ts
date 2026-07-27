//
//
//
import z from "zod"
import { CONTENT } from "../@consts"


//
export const z_U__source_options_content_parquet = z.object({
	"content-type": z.literal(CONTENT.PARQUET),
	"parquet-utf8": z.boolean().optional(),
})


//
export type U__source_options_content_parquet = z.infer<typeof z_U__source_options_content_parquet>//