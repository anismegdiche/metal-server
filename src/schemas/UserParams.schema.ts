//
//
//
//
//
import { VALIDATION_ERROR_MESSAGE } from "../lib/Const"


export const UserParamsSchema: any = {
    username: {
        in: ['body'],
        trim: true,
        isString: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
    },
    password: {
        in: ['body'],
        trim: true,
        isString: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
    }
}