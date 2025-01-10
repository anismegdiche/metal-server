//
//
//
//
//

import { RX } from "../lib/Const"
import { JsonHelper } from "../lib/JsonHelper"
import { StringHelper } from "../lib/StringHelper"
import { Sandbox } from "../server/Sandbox"
import { Logger } from "./Logger"


//
export class PlaceHolder {

    static GetVarName(str: string): string[] | undefined {
        if (StringHelper.IsEmpty(str))
            return undefined

        const matches = str.match(RX.CONTEXT_VAR)
        return matches ?? undefined
    }


    static EvaluateJsCode<T = string>(stringWithJsCode: T | undefined, sandBox: Sandbox): T | undefined {
        if (stringWithJsCode === undefined)
            return undefined

        const isString = typeof stringWithJsCode === 'string'

        const _stringWithJsCode = isString
            ? stringWithJsCode
            : JsonHelper.Stringify(stringWithJsCode)

        const evaluated = _stringWithJsCode.replace(RX.JS_CODE, (_match, _code) => {
            try {
                const __result = sandBox.Evaluate(_code)
                return (__result === undefined)
                    ? ''
                    : __result.toString()
            } catch (error: unknown) {
                Logger.Error(error)
                // Return the original placeholder if there's an error
                return _match
            }
        })

        return isString
            ? evaluated as T | undefined
            : JsonHelper.TryParse<T | undefined>(evaluated, undefined)
    }
}