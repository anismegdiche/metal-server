//
//
//
//
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { DataTable } from '../types/DataTable'
import { TOptions } from '../types/TOptions'
import { Convert } from './Convert'


export class CommonProviderOptionsData {
    static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.data) {
            options.Data = new DataTable(
                schemaRequest.entity,
                Convert.ReplacePlaceholders(schemaRequest.data)
            )
        }
        return options
    }
}