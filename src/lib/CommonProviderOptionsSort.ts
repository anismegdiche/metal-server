//
//
//
//
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TOptions } from '../types/TOptions'


export class CommonProviderOptionsSort {
    static Get(agg: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.sort) {
            agg.Sort = schemaRequest.sort
        }
        return agg
    }
}