//
//
//
//
//
import type { TContext } from "../../modules/sandbox/types/TContext"
import type { TSchemaRequest, TSchemaRequestInsert, TSchemaRequestSelect } from "../../modules/schema/types/TSchemaRequest"


//
export class clsContext {
    GetContext(schemaRequest: TSchemaRequest): Partial<TContext> {
        let $entity: string | undefined
        let $schema: string | undefined
        if ((schemaRequest as TSchemaRequestSelect)?.entity) {
            $entity = (schemaRequest as TSchemaRequestSelect).entity
        }
        if ((schemaRequest as TSchemaRequestSelect)?.schema) {
            $schema = (schemaRequest as TSchemaRequestSelect).schema
        }
        const $options = {
            fields: (schemaRequest as TSchemaRequestSelect)?.fields,
            filter: (schemaRequest as TSchemaRequestSelect)?.filter,
            "filter-expression": (schemaRequest as TSchemaRequestSelect)?.["filter-expression"],
            sort: (schemaRequest as TSchemaRequestSelect)?.sort,
            cache: (schemaRequest as TSchemaRequestSelect)?.cache,
            data: (schemaRequest as TSchemaRequestInsert)?.data,
        }
        return {
            $entity,
            $schema,
            $options,
        }
    }
}