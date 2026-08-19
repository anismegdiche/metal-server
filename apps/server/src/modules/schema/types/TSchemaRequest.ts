//
//
//
//
import { z_T_IntPositive, z_TJson } from "@metal/types"
import { z } from "zod"
import { z_TOrderBy } from "../../../types/DataTable"
import { ZodUtils } from "../../../utils/ZodUtils"


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

// limit
const z_limit = z.coerce
	.number({ message: "limit must be a positive integer" })
	.int({ message: "limit must be an integer" })
	.positive({ message: "limit must be greater than 0" })

// offset
const z_offset = z.coerce
	.number({ message: "offset must be a non-negative integer" })
	.int({ message: "offset must be an integer" })
	.nonnegative({ message: "offset must be greater than or equal to 0" })

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

export const z_TSchemaRequestSelectBase = z_TSchemaRequestBase.extend(
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
			limit: z_limit
				.optional(),
			offset: z_offset
				.optional(),
			cache: z_cache
				.optional(),
			anonymize: z_anonymize
				.optional(),
		},
		{ message: "options must be one of the following: fields, filter, filter-expression, sort, limit, offset, cache, anonymize" },
	).shape,
)

export const z_TSchemaRequestSelect = ZodUtils.WithExclusiveFilter(z_TSchemaRequestSelectBase)

export const z_TSchemaRequestUpdateBase = z_TSchemaRequestBase.extend(
	z.strictObject(
		{
			filter: z_filter
				.optional(),
			"filter-expression": z_filter_expression
				.optional(),
			data: z_data,
		},
		{ message: "options must be one of the following: filter, filter-expression, data" },
	).shape,
)

export const z_TSchemaRequestUpdate = ZodUtils.WithExclusiveFilter(z_TSchemaRequestUpdateBase)

export const z_TSchemaRequestDeleteBase = z_TSchemaRequestBase.extend(
	z.strictObject(
		{
			filter: z_filter
				.optional(),
			"filter-expression": z_filter_expression
				.optional(),
		},
		{ message: "options must be one of the following: filter, filter-expression" },
	).shape,
)

export const z_TSchemaRequestDelete = ZodUtils.WithExclusiveFilter(z_TSchemaRequestDeleteBase)

export const z_TSchemaRequestInsert = z_TSchemaRequestBase
	.extend(
		z.strictObject(
			{
				data: z_data,
			},
			{ message: "options must be one of the following: data" },
		).shape,
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
