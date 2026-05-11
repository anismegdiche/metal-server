//
//
//
import { z } from "zod"
//
import { z_TOrderBy } from "../../../types/DataTable"
import { z_T_IntPositive } from "../../../types/T_IntPositive"
import { z_TJson } from "../../../types/TJson"


// SchemaRequestBase
export const z_schema = z.string()
	.trim()
	.min(1, { message: "schema must be a non empty string" })

export const z_entity = z.string()
	.trim()
	.min(1, { message: "entity must be a non empty string" })

export const z_source = z.string({ message: "source must be a non empty string" })
	.trim()

export const z_TSchemaRequestBase = z.object({
	schema: z_schema,
	entity: z_entity,
	source: z_source
		.optional()
})



// Options

// fields
const z_fields = z.string({ message: "fields must be a comma separated list of field names" })
	.optional()

// filter
const z_filter = z_TJson

// filter-expression
const z_filter_expression = z.string({ message: "filter-expression must be a valid expression" })

// sort
const z_sort = z_TOrderBy

// cache
const z_cache = z_T_IntPositive
	.min(1, { message: "cache must be greater than 0" })

// data
const z_data = z.union([
	z_TJson,
	z.array(
		z_TJson
	)
])

// anonymize
const z_anonymize = z.union([
	z.string({ message: "anonymize must be a comma separated list of field names" }),
	z.array(
		z.string()
	)
])


// TSchemaRequest

export const z_TSchemaRequestSelect = z_TSchemaRequestBase.merge(
	z.strictObject(
		{
			fields: z_fields
				.optional(),
			filter: z_filter
				.optional(),
			"filter-expression": z_filter_expression
				.optional(),
			sort: z_sort
				.optional(),
			cache: z_cache
				.optional(),
			anonymize: z_anonymize
				.optional(),
		},
		{ message: "options must be one of the following: fields, filter, filter-expression, sort, cache, anonymize" },
	),
)

export const z_TSchemaRequestUpdate = z_TSchemaRequestBase
	.merge(
		z.strictObject(
			{
				filter: z_filter
					.optional(),
				"filter-expression": z_filter_expression
					.optional(),
				data: z_data,
			},
			{ message: "options must be one of the following: filter, filter-expression, data" },
		),
	)

export const z_TSchemaRequestDelete = z_TSchemaRequestBase
	.merge(
		z.strictObject(
			{
				filter: z_filter
					.optional(),
				"filter-expression": z_filter_expression
					.optional(),
			},
			{ message: "options must be one of the following: filter, filter-expression" },
		),
	)

export const z_TSchemaRequestInsert = z_TSchemaRequestBase
	.merge(
		z.strictObject(
			{
				data: z_data,
			},
			{ message: "options must be one of the following: data" },
		),
	)

export const z_TSchemaRequestListEntities = z_TSchemaRequestBase
	.omit({ entity: true })

export const z_TSchemaRequestAddEntity = z_TSchemaRequestBase

export const z_TSchemaRequest = z.discriminatedUnion("schema", [
	z_TSchemaRequestBase,
	z_TSchemaRequestSelect,
	z_TSchemaRequestUpdate,
	z_TSchemaRequestDelete,
	z_TSchemaRequestInsert,
	z_TSchemaRequestListEntities,
	z_TSchemaRequestAddEntity,
])


//
export type TSchemaRequestSelect = z.infer<typeof z_TSchemaRequestSelect>
export type TSchemaRequestUpdate = z.infer<typeof z_TSchemaRequestUpdate>
export type TSchemaRequestDelete = z.infer<typeof z_TSchemaRequestDelete>
export type TSchemaRequestInsert = z.infer<typeof z_TSchemaRequestInsert>
export type TSchemaRequestListEntities = z.infer<typeof z_TSchemaRequestListEntities>
export type TSchemaRequestAddEntity = z.infer<typeof z_TSchemaRequestAddEntity>
export type TSchemaRequest = z.infer<typeof z_TSchemaRequest>
export type TSchemaRequestBase = z.infer<typeof z_TSchemaRequestBase>
