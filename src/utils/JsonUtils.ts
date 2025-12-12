//
//
//
// eslint-disable-next-line lodash/import-scope
import type { Dictionary } from 'lodash'
import forEach from 'lodash/forEach'
import forOwn from 'lodash/forOwn'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import isObject from 'lodash/isObject'
import isString from 'lodash/isString'
import pickBy from 'lodash/pickBy'
import set from 'lodash/set'
//
import * as chrono from 'chrono-node'
import objectPath from 'object-path'
//
import { TJson } from "../types/TJson"
import { Logger } from "./Logger"
import { Stringify } from "./JsonUtils/Stringify"

const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_REGEX = /^[0-9a-f]{20,}$/i; // long hex strings (tokens, hashes)

//
export class JsonUtils {

    static TryParse<T>(jsonString: string | undefined, defaultValue: T, silent: boolean = false): T {
        if (!jsonString)
            return defaultValue;

        try {
            return JSON.parse(jsonString, (key, value) => {
                if (typeof value !== 'string')
                    return value;

                // 1. Reject known data types that should NOT be interpreted as dates
                if (BASE64_REGEX.test(value)) return value;
                if (UUID_REGEX.test(value)) return value;
                if (HEX_REGEX.test(value)) return value;

                // 2. Very short strings cannot be real dates
                if (value.length < 4) return value;

                // 4. Try parsing with chrono STRICT
                const parsed = chrono.strict.parseDate(value);
                if (parsed !== null && !isNaN(parsed.getTime()))
                    return parsed;

                return value;
            });

        } catch (error) {
            if (!silent)
                Logger.Error(`JsonUtils.TryParse Error: ${JsonUtils.Stringify(error)}`);
            return defaultValue;
        }
    }


    static Get<T>(json: TJson, jsonPath?: string, defaultValue?: T): T {
        if (!jsonPath)
            return json as T

        const _jsonPath = jsonPath.replace(/\[(\d+)\]/g, '.$1')

        const extractedData = objectPath.get(json, _jsonPath) ?? get(json, jsonPath)

        return (extractedData)
            ? extractedData as T
            : defaultValue as T
    }

    static Set<T extends object>(json: T, jsonPath?: string, data?: any): T {
        if (jsonPath) {
            json = set(json, jsonPath!, data)
        } else {
            json = data as T
        }
        return json
    }

    static Stringify<T>(json: T): string {
        return Stringify(json)
    }


    static SafeCopy<T>(json: T): T {
        try {
            return JSON.parse(JSON.stringify(json))
            // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (error) {
            const _json = JSON.parse(JsonUtils.Stringify(json))
            JsonUtils.RemoveUselessKeys(_json)
            return _json
        }
    }

    static Size<T>(json: T): number {
        const jsonString = JsonUtils.Stringify(json)
        return Buffer.byteLength(jsonString, 'utf8')
    }

    static RemoveUselessKeys(obj: any): void {
        forOwn(obj, (value, key) => {
            if (isObject(value)) {
                JsonUtils.RemoveUselessKeys(value)
            }

            if (["[Object]", "[Array]"].includes(value) || (Array.isArray(value) && value.every(v => v === null))) {
                delete obj[key]
            }
        })
    }

    static ToArray(obj: TJson | undefined): TJson[] {
        if (!obj)
            return []

        return Object
            .entries(obj)
            .map(([k, v]) => ({ [k]: v }))
    }

    static PrefixKeys(obj: TJson, prefix: string = ''): TJson {
        const result: TJson = {}

        forEach(obj, (value, key) => {
            const newKey = `${prefix}${key}`

            result[newKey] = isObject(value) && value !== null && !Array.isArray(value)
                ? JsonUtils.PrefixKeys(value as TJson, prefix)
                : value
        })

        return result
    }


    static IsEmpty<T>(obj: Dictionary<T>): boolean {
        return isEmpty(obj)
    }

    static ReplaceStrings(obj: TJson, pattern: RegExp, replacement: string): TJson {
        forEach(obj, (v, k) => {
            switch (true) {
                case isString(v):
                    obj[k] = v.replace(pattern, replacement)
                    break
                case JsonUtils.IsJson(v):
                    obj[k] = JsonUtils.ReplaceStrings(v as TJson, pattern, replacement)
                    break
                case Array.isArray(v):
                    obj[k] = v.map(_v => JsonUtils.ReplaceStrings(_v as TJson, pattern, replacement))
                    break
                default:
                    break
            }
        })
        return obj
    }

    static IsJson(obj: unknown): boolean {
        return typeof obj === 'object' &&
            obj !== null &&
            !Array.isArray(obj) &&
            !(obj instanceof Date) &&
            !(obj instanceof RegExp) &&
            !(obj instanceof Map) &&
            !(obj instanceof Set)
    }

    static RemoveUndefined<T>(obj: T): T {
        return pickBy(obj as object, v => v !== undefined) as T
    }

    static Join(json: TJson | undefined, keyValueSeparator: string = '=', propertiesSeparator: string = ",") {
        if (!json)
            return ''

        const parts: string[] = []

        forEach(json, (value, key) => {
            parts.push(`${key}${keyValueSeparator}${JsonUtils.Stringify(value)}`)
        })

        return parts.join(propertiesSeparator)
    }
}