//
//
//
import z from "zod"
import { CONTENT } from "../@consts"


//
export const z_U__source_options_content_xls = z.object({
	"content-type": z.literal(CONTENT.XLS),
	"xls-sheet": z.string().optional(),
	"xls-starting-cell": z.string().optional(),
	"xls-default": z.union([z.number(), z.string(), z.null()]).optional(),
	"xls-parse-dates": z.boolean().optional(),
	"xls-date-format": z.string().optional(),
})


//
export type U__source_options_content_xls = z.infer<typeof z_U__source_options_content_xls>//