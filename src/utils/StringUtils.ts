//
//
//
import path from "node:path"
import { Stringify } from "./JsonUtils/Stringify"

import urlJoin from "@loxjs/url-join"


//
export class StringUtils {
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
        const cleanSubPaths = subPaths.filter((path: string | undefined) => !StringUtils.IsEmpty(path)) as string[]
        if (cleanSubPaths.length == 0)
            return ''

        return urlJoin(...cleanSubPaths)
            .replace(/\\/g, '/')
    }

    static Path(...subPaths: Array<string | undefined>) {
        const cleanSubPaths = subPaths.filter((path: string | undefined) => !StringUtils.IsEmpty(path)) as string[]
        if (cleanSubPaths.length == 0)
            return ''

        return path.posix.join(...cleanSubPaths)
    }

    static ToString<T>(value: T): string {
        if (value === null || value === undefined) {
            return '';
        }
        switch (typeof value) {
            case 'string':
                return value;
            case 'number':
                return value.toString();
            case 'object':
                return Stringify(value);
            case 'boolean':
                return value
                    ? 'true'
                    : 'false';
            default:
                return String(value);
        }
    }

    static IsBase64(str: unknown): boolean {
        // simple test
        if (typeof str !== 'string') {
            return false;
        }

        // Check length is multiple of 4
        if (str.length % 4 !== 0) {
            return false;
        }

        // Check for valid padding
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
            return false;
        }

        return true
    }

    static IsLatin(str: string) {
        // eslint-disable-next-line no-control-regex
        return /^[\u0000-\u024F]*$/.test(str);
    }
}