//
//
//
//
//
import { TContext } from "../@types/TContext"
import { TSchemaRequest } from "../types/TSchemaRequest"


//
export class clsContext {

    // eslint-disable-next-line class-methods-use-this
    GetContext(schemaRequest: TSchemaRequest): Partial<TContext> {
        return {
            $entity: schemaRequest.entity,
            $schema: schemaRequest.schema
        }
    }
}