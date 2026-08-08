//
//
//
import z from "zod"
//
import { z_U__source_options_content_csv } from "./U__source_options_content_csv"
import { z_U__source_options_content_json } from "./U__source_options_content_json"
import { z_U__source_options_content_parquet } from "./U__source_options_content_parquet"
import { z_U__source_options_content_xlsx } from "./U__source_options_content_xlsx"
import { z_U__source_options_content_xml } from "./U__source_options_content_xml"

//
export const z_U__source_options_content = z.discriminatedUnion("content-type", [
	z_U__source_options_content_csv,
	z_U__source_options_content_parquet,
	z_U__source_options_content_xlsx,
	z_U__source_options_content_xml,
	z_U__source_options_content_json
])

//
export type U__source_options_content = z.infer<typeof z_U__source_options_content>
