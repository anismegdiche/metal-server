//
//
//
//
//
import typia from "typia"
//
import { DataTable } from "../types/DataTable"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse } from "../types/TSchemaResponse"
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
    static IsSchemaResponseData(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponse {
        return typia.is<TSchemaResponse>(schemaResponse) &&
            typia.is<DataTable>(schemaResponse.data)
    }

    @Logger.LogFunction(Logger.Debug, true)
    static IsDataTable(dataTable: unknown): dataTable is DataTable {
        return typia.is<DataTable>(dataTable)
    }

    @Logger.LogFunction(Logger.Debug, true)
    static Validate(res: any, httpError: HttpError = new HttpErrorInternalServerError()) {
        if (res.success)
            return
        
        const _renamedErrors = res.errors.map((error: any) => {
            let _ret = `${error.path.replace('$input.', '')} expected to be ${error.expected}`
            return TypeHelper.TranslateFriendlyErrors(_ret)
        })

        Logger.Error(`${httpError.Name}:\r\n - ${_renamedErrors.join('\r\n - ')}`)
        httpError.message = _renamedErrors
        delete httpError.stack
        throw httpError
    }

    static TranslateFriendlyErrors(txt: string) {
        return txt
            .replace("TJson", "JSON")
            .replace("$input expected to be TConfig", "Configuration file is empty")
    }
}