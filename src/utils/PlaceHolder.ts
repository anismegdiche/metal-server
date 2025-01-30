//
//
//
//
//
import { JsonHelper } from "../lib/JsonHelper"
import { StringHelper } from "../lib/StringHelper"
import { Sandbox } from "../server/Sandbox"
import { Logger } from "./Logger"
import { TJson } from "../types/TJson"


//
// const RX_JS_CODE: RegExp = /\$\{\{([^}]+)}\}/m
const RX_JS_CODE: RegExp = /\$\{\{(.*?)\}\}/m
const RX_CONTEXT_VAR: RegExp = /\$[\w.]+/g


//
export class PlaceHolder {

    static GetVarName(str: string): string[] | undefined {
        if (StringHelper.IsEmpty(str))
            return undefined

        const matches = str.match(RX_CONTEXT_VAR)
        return matches ?? undefined
    }

    static EvaluateJsCode<T>(jsCode: any, sandBox: Sandbox): T | undefined {
        // case undefined
        if (jsCode === undefined || jsCode === null)
            return undefined

        // case no js code
        const _jsCodeString = (typeof jsCode === 'string')
            ? jsCode
            : JsonHelper.Stringify(jsCode)

        if (RX_JS_CODE.exec(_jsCodeString) === null)
            return jsCode

        // case js code type
        switch (true) {
            case Array.isArray(jsCode):
                return jsCode.map(item => PlaceHolder.EvaluateJsCode(item, sandBox)) as T

            case typeof jsCode === 'object' && !Array.isArray(jsCode):
                return PlaceHolder.EvaluateJsCodeObject(jsCode, sandBox) as T

            case typeof jsCode === 'string':
                return (jsCode.trim().startsWith('${{') && jsCode.trim().endsWith('}}'))
                    ? PlaceHolder.EvaluateJsCodeStringObject(jsCode, sandBox) as T
                    : PlaceHolder.EvaluateJsCodeString(jsCode, sandBox) as T

            default:
                return jsCode
        }
    }

    static EvaluateJsCodeString(jsCode: string, sandBox: Sandbox): string {
        return jsCode.replace(RX_JS_CODE, (_match, _code) => {
            try {
                // file deepcode ignore ImproperCodeSanitization: // TODO Review this
                const result = sandBox.Evaluate(_code)
                if (result === undefined)
                    throw new Error(`PlaceHolder.EvaluateJsCodeString_v2: Failed to evaluate code: ${_code}`)
                return StringHelper.ToString(result)
            } catch (error: unknown) {
                Logger.Error(error)
                return _match // Preserve original placeholder if an error occurs
            }
        })
    }

    static EvaluateJsCodeStringObject(jsCode: string, sandBox: Sandbox): any | undefined {
        const match = RX_JS_CODE.exec(jsCode)

        if (match?.[1])
            return sandBox.Evaluate(match[1].trim())        

        return undefined
    }

    static EvaluateJsCodeObject(jsCode: TJson, sandBox: Sandbox): TJson {
        const result: Record<string, unknown> = {}
        for (const key in jsCode) {
            if (Object.hasOwn(jsCode, key)) {
                const value = jsCode[key] as string | TJson | TJson[]
                const evaluatedKey = PlaceHolder.EvaluateJsCode<string>(key, sandBox)
                const evaluatedValue = PlaceHolder.EvaluateJsCode(value, sandBox)
                if (evaluatedKey && evaluatedValue)
                    result[evaluatedKey] = evaluatedValue
            }
        }
        return result
    }
}