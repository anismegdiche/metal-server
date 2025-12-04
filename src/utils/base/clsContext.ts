//
//
//
//
//
import { TContext } from "../../modules/sandbox/types/TContext"
import { TSchemaRequest } from "../../modules/schema/types/TSchemaRequest"


//
export class clsContext {

     
    GetContext(schemaRequest: TSchemaRequest): Partial<TContext> {
        return {
            $entity: schemaRequest.entity,
            $schema: schemaRequest.schema,
            $options: {
                data: schemaRequest.data,
                fields: schemaRequest.fields,
                filter: schemaRequest.filter,
                "filter-expression": schemaRequest["filter-expression"],
                sort: schemaRequest.sort,
                cache: schemaRequest.cache
            }
        }
    }
}