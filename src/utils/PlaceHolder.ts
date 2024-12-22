//
//
//
//
//

import { RX } from "../lib/Const"
import { StringHelper } from "../lib/StringHelper"
import { Sandbox } from "../server/Sandbox"


//
export class PlaceHolder {

    static GetVarName(str: string): string[] | undefined {
        if (StringHelper.IsEmpty(str))
            return undefined
        
        const matches = str.match(RX.CONTEXT_VAR)
        return matches ?? undefined
    }

    static EvaluateJsCode(stringWithJSCode: string | undefined, sandBox: Sandbox): string | undefined {
        if (stringWithJSCode === undefined)
            return undefined

        return stringWithJSCode.replace(RX.JS_CODE, (_match, code) => {
            try {
                const __result = sandBox.Evaluate(code)
                return (__result === undefined)
                    ? ''
                    : __result.toString()
                // eslint-disable-next-line unused-imports/no-unused-vars
            } catch (_error: unknown) {
                // Return the original placeholder if there's an error
                return stringWithJSCode
            }
        })
    }
}