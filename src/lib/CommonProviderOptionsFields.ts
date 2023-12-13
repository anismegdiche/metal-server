//
//
//
//
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TOptions } from '../types/TOptions'


export class CommonProviderOptionsFields {
    static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        options.Fields = (schemaRequest?.fields === undefined)
            ? '*'
            : schemaRequest.fields

        return options
    }
}