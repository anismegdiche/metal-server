//
//
//
import { z } from "zod"
//
import { z_TOrderBy } from "../../../types/DataTable"
import { z_TJson } from "../../../types/TJson"


// SchemaRequestBase
export const z_schema = z.string("schema must be a non empty string").trim().min(1, { message: "schema is required" });
export const z_entity = z.string("entity must be a non empty string").trim().min(1, { message: "entity is required" });
export const z_source = z.string("source must be a non empty string").trim().min(1, { message: "source is required" });

export const z_TSchemaRequestBase = z.object({
    schema: z_schema,
    entity: z_entity,
    source: z_source.optional(),
});
// Options
// fields
const z_fields = z.string("fields must be a comma separated list of field names").optional();
// filter
const z_filter = z_TJson.optional();
// filter-expression
const z_filter_expression = z.string("filter-expression must be a valid expression").optional();
// sort
const z_sort = z_TOrderBy.optional();
// cache
const z_cache = z.number("cache must be a number of seconds").min(0).optional();
// data
const z_data = z.union([z_TJson, z.array(z_TJson)], "data must be a valid json or an array of valid json").optional();
// anonymize
const z_anonymize = z.union([z.string("anonymize must be a comma separated list of field names"), z.array(z.string())]).optional();
// TSchemaRequest


export const z_TSchemaRequestSelect = z_TSchemaRequestBase.merge(
    z.strictObject({
        fields: z_fields,
        filter: z_filter,
        "filter-expression": z_filter_expression,
        sort: z_sort,
        cache: z_cache,
        anonymize: z_anonymize
    }, "options must be one of the following: fields, filter, filter-expression, sort, cache, anonymize")
);

export const z_TSchemaRequestUpdate = z_TSchemaRequestBase.merge(
    z.strictObject({
        filter: z_filter,
        "filter-expression": z_filter_expression,
        data: z_data
    }, "options must be one of the following: filter, filter-expression, data")
);

export const z_TSchemaRequestDelete = z_TSchemaRequestBase.merge(
    z.strictObject({
        filter: z_filter,
        "filter-expression": z_filter_expression,
    }, "options must be one of the following: filter, filter-expression")
);

export const z_TSchemaRequestInsert = z_TSchemaRequestBase.merge(
    z.strictObject({
        data: z_data
    }, "options must be one of the following: data")
);

export const z_TSchemaRequestListEntities = z_TSchemaRequestBase.omit({ entity: true });

export const z_TSchemaRequest = z.union([
    z_TSchemaRequestSelect,
    z_TSchemaRequestUpdate,
    z_TSchemaRequestDelete,
    z_TSchemaRequestInsert,
    z_TSchemaRequestListEntities,
]);


//
export type TSchemaRequestSelect = z.infer<typeof z_TSchemaRequestSelect>
export type TSchemaRequestUpdate = z.infer<typeof z_TSchemaRequestUpdate>
export type TSchemaRequestDelete = z.infer<typeof z_TSchemaRequestDelete>
export type TSchemaRequestInsert = z.infer<typeof z_TSchemaRequestInsert>
export type TSchemaRequestListEntities = z.infer<typeof z_TSchemaRequestListEntities>
export type TSchemaRequest = z.infer<typeof z_TSchemaRequest>