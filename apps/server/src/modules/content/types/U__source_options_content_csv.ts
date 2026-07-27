//
//
//
import z from "zod"
import { CONTENT } from "../@consts"


//
export const z_U__source_options_content_csv = z.object({
	"content-type": z.literal(CONTENT.CSV),
    "csv-delimiter": z.string().optional(),
	"csv-newline": z.string().optional(),
	"csv-header": z.boolean().optional(),
	"csv-quote": z.union([z.string(), z.null()]).optional(),
	"csv-skip-empty-lines": z.boolean().optional(),
})


//
export type U__source_options_content_csv = z.infer<typeof z_U__source_options_content_csv>//