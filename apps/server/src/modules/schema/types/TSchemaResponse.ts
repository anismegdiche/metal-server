//
//
//
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { z_entity, z_schema } from "./TSchemaRequest"

//
export const z_TSchemaResponse = z.object({
	schema: z_schema,
	entity: z_entity.optional(),
	status: z.literal(HTTP_STATUS_CODE.OK),
	data: z.instanceof(DataTable),
})

//
export type TSchemaResponse = z.infer<typeof z_TSchemaResponse>
