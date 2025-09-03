//
//
//
//
import { HttpError, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"
import { TSchemaRequest, TSchemaRequestSelect } from "../modules/schema/types/TSchemaRequest"
import { TSchemaResponse } from "../modules/schema/types/TSchemaResponse"
import { DataTable } from "../types/DataTable"
import { Logger } from "./Logger"
import { Validator } from "./Validator"


//
export type TConvertParams<S extends string> =
    S extends `${infer T}-${infer U}` ? `${T}${Capitalize<TConvertParams<U>>}` : S

export class TypeUtils {

    @Logger.LogFunction(true)
    static IsSchemaRequest(schemaRequest: unknown): schemaRequest is TSchemaRequest {
        return Validator.SchemaRequest(schemaRequest);
    }

    static IsSchemaRequestSelect(schemaRequest: unknown): schemaRequest is TSchemaRequestSelect {
        return Validator.SchemaRequestSelect(schemaRequest);
    }

    @Logger.LogFunction(true)
    static IsSchemaResponse(schemaResponse: unknown): schemaResponse is TSchemaResponse {
        return Validator.SchemaResponse(schemaResponse);
    }

    @Logger.LogFunction(true)
    static IsSchemaResponseWithData(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponse {
        return Validator.SchemaResponse(schemaResponse) && DataTable.Is(schemaResponse.data);
    }

    @Logger.LogFunction(true)
    static Validate(res: any, httpError: HttpError = new HttpErrorInternalServerError()) {
        if (res.success)
            return

        const renamedErrors = res.errors.map((error: any) => {
            const _ret = `${error.path.replace('$input.', '')} expected to be ${error.expected}`
            return TypeUtils.#translateFriendlyErrors(_ret)
        })

        Logger.Error(`${httpError.Name}:\r\n - ${renamedErrors.join('\r\n - ')}`)
        httpError.message = renamedErrors
        httpError.Name = "Bad Parameters"
        delete httpError.stack
        throw httpError
    }

    static #translateFriendlyErrors(txt: string) {
        return txt
            .replace("TJson", "JSON")
            .replace("$input expected to be TConfig", "Configuration file is empty")
            .replace("$input", "")
            .replace(/__type\.o\d+/, "object")
            .replace(/__@toStringTag@\d+/, "")
            .replace(" | undefined", "")
    }
}