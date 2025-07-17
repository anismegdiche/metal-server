/* eslint-disable @typescript-eslint/no-unsafe-function-type */
//
//
//
//
import { TJson } from "../types/TJson"


//
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
const ARGUMENT_NAMES = /([^\s,]+)/g


//
export class DecoratorUtils {
    static GetParameters(originalMethod: Function, ...args: any[]): TJson {
        const fnStr = originalMethod.toString().replace(STRIP_COMMENTS, '')
        const params = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES)
        return (params)
            ? Object.fromEntries(params.map((name, index) => [name, args[index]]))
            : {}
    }
}