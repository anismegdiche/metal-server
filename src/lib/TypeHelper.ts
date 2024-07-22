//
//
//
//
//
import { DataTable } from "../types/DataTable"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError } from "../types/TSchemaResponse"
import { Helper } from "./Helper"

export class TypeHelper {
    static IsSchemaRequest(schemaRequest: any): schemaRequest is TSchemaRequest {
        if (schemaRequest?.schemaName !== undefined && !schemaRequest?.entityName) {
            return false
        }
        return Helper.HasExpectedProperties(schemaRequest, [
            'schemaName',
            'entityName',
            'filter',
            'filterExpression',
            'fields',
            'data',
            'sort',
            'cache',
            'sourceName'
        ])
    }

    static IsSchemaResponseError(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponseError {
        return Helper.HasExpectedProperties(schemaResponse, ['error'])
    }

    static IsSchemaResponseData(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponseData {
        return 'data' in schemaResponse && schemaResponse?.data?.Rows?.length > 0
    }
    
    static IsDataTable(datatable:unknown): datatable is DataTable {
        const b = datatable instanceof DataTable
        return b
    }
}