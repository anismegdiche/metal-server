//
//
//
//
//
import { DataTable } from "../types/DataTable"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError } from "../types/TSchemaResponse"
import { Helper } from "./Helper"
import { Logger } from "../utils/Logger"

export class TypeHelper {
    // TODO: to check
    @Logger.LogFunction()
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
    
    //@Logger.DebugFunction()
    static IsSchemaResponse(schemaResponse: any): schemaResponse is TSchemaResponse {
        return Helper.HasExpectedProperties(schemaResponse, [
            'schemaName',
            'entityName',
            'transaction',
            'result',
            'status'
        ])
    }

    @Logger.LogFunction()
    static IsSchemaResponseError(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponseError {
        return Helper.HasExpectedProperties(schemaResponse, ['error'])
    }

    @Logger.LogFunction()
    static IsSchemaResponseData(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponseData {
        return 'data' in schemaResponse && schemaResponse?.data?.Rows?.length > 0
    }
    
    @Logger.LogFunction()
    static IsDataTable(datatable:unknown): datatable is DataTable {
        const b = datatable instanceof DataTable
        return b
    }
}