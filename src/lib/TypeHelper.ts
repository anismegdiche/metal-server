//
//
//
//
//
import typia from "typia"
//
import { DataTable } from "../types/DataTable"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError } from "../types/TSchemaResponse"
import { Logger } from "../utils/Logger"
import { HttpError, HttpErrorInternalServerError } from "../server/HttpErrors"

export class TypeHelper {
    // TODO: to check
    @Logger.LogFunction(Logger.Debug, true)
    static IsSchemaRequest(schemaRequest: any): schemaRequest is TSchemaRequest {
        return typia.is<TSchemaRequest>(schemaRequest)
    }

    @Logger.LogFunction(Logger.Debug, true)
    static IsSchemaResponse(schemaResponse: any): schemaResponse is TSchemaResponse {
        return typia.is<TSchemaResponse>(schemaResponse)
    }

    @Logger.LogFunction(Logger.Debug, true)
    static IsSchemaResponseError(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponseError {
        return typia.is<TSchemaResponseError>(schemaResponse)
    }

    @Logger.LogFunction(Logger.Debug, true)
    static IsSchemaResponseData(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponseData {
        return typia.is<TSchemaResponseData>(schemaResponse)
    }

    @Logger.LogFunction(Logger.Debug, true)
    static IsDataTable(dataTable: unknown): dataTable is DataTable {
        return dataTable instanceof DataTable
    }

    @Logger.LogFunction(Logger.Debug, true)
    static Validate(res: any, httpError: HttpError = new HttpErrorInternalServerError()) {
        if (res.success) {
            return
        }
        const _renamedErrors = res.errors.map((error: any) => {
            let _ret = `${error.path.replace('$input.', '')} expected to be ${error.expected}`
            // rename firendly naming
            _ret = _ret.replace("TJson", "JSON")
            return _ret
        })

        Logger.Error(`${httpError.Name}:\r\n - ${_renamedErrors.join('\r\n - ')}`)
        httpError.message = _renamedErrors
        delete httpError.stack
        throw httpError
    }
}