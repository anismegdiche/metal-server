//
//
//
//
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TOptions } from '../types/TOptions'


export class CommonProviderOptionsFields {
    static Get(agg: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.fields === undefined)
            agg.Fields = '*'
        else
            agg.Fields = schemaRequest.fields

        return agg
    }
}