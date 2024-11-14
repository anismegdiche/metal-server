//
//
//
//
//

import { Logger } from "../utils/Logger"

export class StringHelper {
    @Logger.LogFunction()
    static Split(str: string, sep: string): string[] {
        return (str.includes(sep))
            ? str.split(sep)
                .filter(_field => !(_field === undefined || _field.trim() === ""))
                .map(_field => _field.trim())
            : [str]
    }

    @Logger.LogFunction()
    static FixObjectMissingQuotes(str: string): string {
        const stringFixed = str.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        return stringFixed.replace(/:\s*([^"{[,\s][^,\s}]*)/g, ':"$1"')
    }

    @Logger.LogFunction()
    static IsEmpty(str: string | undefined | null): boolean {
        return  str == undefined || str == null || str == '' || str.trim() == ''
    }
}