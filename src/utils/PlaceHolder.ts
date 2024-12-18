//
//
//
//
//

import { RX } from "../lib/Const"
import { Sandbox } from "../server/Sandbox"


//
export class PlaceHolder {
    static ReplaceVar(stringToReplace: string, name: string | undefined, value: string | undefined): string {
        if (name === undefined || value === undefined)
            return stringToReplace

        return stringToReplace.replace(`@{${name}}`, value)
    }

    static GetVarName(str: string): string | undefined {
        const RX_KEY_PATTERN = /@\{(\w+)\}/
        const match = RX_KEY_PATTERN.exec(str)
        return match
            ? match[1]
            : undefined
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