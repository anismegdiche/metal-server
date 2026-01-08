//
//
//
//
import { HttpError, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"
import { Logger } from "./Logger"
import { prettifyError, type ZodSafeParseResult } from "zod"
import type { U_config } from "../modules/core/types/U_config"


//
export type TConvertParams<S extends string> =
    S extends `${infer T}-${infer U}` ? `${T}${Capitalize<TConvertParams<U>>}` : S

export class TypeUtils {
    static Validate(result: ZodSafeParseResult<U_config>, httpError: HttpError = new HttpErrorInternalServerError()) {
        if (result.success)
            return

        const prettyErrors = prettifyError(result.error);
        Logger.Error(`${httpError.Name}:\r\n\r\n${prettyErrors}\r\n`)
        httpError.message = prettyErrors
        httpError.Name = "Bad Parameters"
        delete httpError.stack
        throw httpError
    }

    static GetType(v: unknown): string {
        if (v === null)
            return 'null';

        const t = typeof v;
        if (t !== 'object')
            return t;

        if (Array.isArray(v))
            return 'array';

        if (v instanceof Date)
            return 'date';

        const ctor = (v as { constructor?: new (...args: unknown[]) => unknown })?.constructor;
        if (ctor && ctor !== Object && ctor.name)
            return ctor.name;

        return 'object';
    }
}