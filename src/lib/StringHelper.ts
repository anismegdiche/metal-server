//
//
//
//
//

import path from "node:path"

export class StringHelper {
    static Split(str: string, sep: string): string[] {
        return (str.includes(sep))
            ? str.split(sep)
                .filter(_field => !(_field === undefined || _field.trim() === ""))
                .map(_field => _field.trim())
            : [str]
    }

    static FixObjectMissingQuotes(str: string): string {
        const stringFixed = str.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        return stringFixed.replace(/:\s*([^"{[,\s][^,\s}]*)/g, ':"$1"')
    }

    static IsEmpty(str: string | undefined | null): boolean {
        return str == undefined || str == null || str == '' || str.trim() == ''
    }

    static Url(...subPaths: Array<string | undefined>) {
        const cleanSubPaths = subPaths.filter((path: string | undefined) => !StringHelper.IsEmpty(path)) as string[]
        if (cleanSubPaths.length == 0)
            return ''

        return path
            .join(...cleanSubPaths)
            .replace(/\\/g, '/')
            .replace(':/', '://')
    }
}