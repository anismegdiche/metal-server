//
//
//
import z from "zod"
import { z_U__source_azure_cosmosdb } from "../../source/types/U__source_azure_cosmosdb"
import { z_U__source_azure_sqldb } from "../../source/types/U__source_azure_sqldb"
import { z_U__source_memory } from "../../source/types/U__source_memory"
import { z_U__source_metal } from "../../source/types/U__source_metal"
import { z_U__source_mongodb } from "../../source/types/U__source_mongodb"
import { z_U__source_mysql } from "../../source/types/U__source_mysql"
import { z_U__source_plans } from "../../source/types/U__source_plans"
import { z_U__source_postgres } from "../../source/types/U__source_postgres"
import { z_U__source_sqlserver } from "../../source/types/U__source_sqlserver"
import { z_U__source_storage } from "../../source/types/U__source_storage"
import { z_U__source_webservice } from "../../source/types/U__source_webservice"


//
export const z_U__sources_source = z.discriminatedUnion("provider", [
	z_U__source_azure_cosmosdb,
	z_U__source_memory,
	z_U__source_metal,
	z_U__source_mongodb,
	z_U__source_mysql,
	z_U__source_plans,
	z_U__source_postgres,
	z_U__source_sqlserver,
	z_U__source_storage,
	z_U__source_webservice,
	z_U__source_azure_sqldb
])

export const z_U__sources = z.union([
	z.record(z.string(), z_U__sources_source),
	z.literal(null),
]).default(null)

//
export type U__sources_source = z.infer<typeof z_U__sources_source>
export type U__sources = z.infer<typeof z_U__sources>
