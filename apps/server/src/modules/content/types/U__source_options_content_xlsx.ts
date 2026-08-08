//
//
//
import z from "zod"
import { CONTENT } from "../@consts"


//
export const z_U__source_options_content_xlsx = z.object({
	"content-type": z.literal(CONTENT.XLSX),
	"xlsx-sheet": z.string().optional(),
	"xlsx-starting-cell": z.string().optional(),
	"xlsx-default": z.union([z.number(), z.string(), z.null()]).optional(),
	"xlsx-parse-dates": z.boolean().optional(),
	"xlsx-date-format": z.string().optional(),
})


//
export type U__source_options_content_xlsx = z.infer<typeof z_U__source_options_content_xlsx>//