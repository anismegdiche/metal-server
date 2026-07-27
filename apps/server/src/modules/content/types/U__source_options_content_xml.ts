//
//
//
import z from "zod"
import { CONTENT } from "../@consts"


//
export const z_U__source_options_content_xml = z.object({
	"content-type": z.literal(CONTENT.XML),
	"xml-path": z.string().optional(),
	"xml-ignore-attributes": z.boolean().optional(),
	"xml-attribute-prefix": z.string().optional(),
	"xml-remove-ns-prefix": z.boolean().optional(),
})


//
export type U__source_options_content_xml = z.infer<typeof z_U__source_options_content_xml>//