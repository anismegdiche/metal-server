//
//
//
//
//
import _, { Dictionary } from "lodash"
import { configure } from 'safe-stable-stringify'
import * as chrono from 'chrono-node'
import objectPath from 'object-path'
//
import { TJson } from "../types/TJson"
import { Logger } from "../utils/Logger"
import { StringHelper } from './StringHelper'
import { HttpErrorInternalServerError } from "../server/HttpErrors"

const SafeStableStringify = configure({
    circularValue: undefined,
    maximumDepth: 5
})


export class JsonHelper {

    static TryParse<T>(jsonString: string | undefined, defaultValue: T): T {
        if (!jsonString)
            return defaultValue

        try {
            return JSON.parse(jsonString, (key, value) => {
                if (typeof value === 'string') {
                    // case Date string
                    const _parsedDate = chrono.strict.parseDate(value)
                    if (_parsedDate !== null)
                        return _parsedDate
                }
                return value
            })
        } catch (error) {
            Logger.Error(`JsonHelper.TryParse Error: ${JsonHelper.Stringify(error)}`)
            return defaultValue
        }
    }

    static Get<T>(json: TJson, jsonPath?: string, defaultValue?: T): T {
        if (!jsonPath)
            return json as T

        const _jsonPath = jsonPath.replace(/\[(\d+)\]/g, '.$1')

        // eslint-disable-next-line you-dont-need-lodash-underscore/get
        const extractedData = objectPath.get(json, _jsonPath) ?? _.get(json, jsonPath)

        return (extractedData)
            ? extractedData as T
            : defaultValue as T
    }

    static Set<T extends object>(json: T, jsonPath?: string, data?: any): T {
        if (!data)
            return json

        if (!StringHelper.IsEmpty(jsonPath)) 
            return _.set(json, jsonPath!, data)

        if (['object', 'undefined','null'].includes(typeof data)) {
            // eslint-disable-next-line no-param-reassign
            json = data as T
            return json
        }
        throw new HttpErrorInternalServerError(`JsonHelper.Set Error: ${JsonHelper.Stringify(data)}`)
    }

    static Stringify<T>(json: T): string {
        try {
            return JSON.stringify(json)
            // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (error) {
            return SafeStableStringify(json) ?? ""
        }
    }

    static SafeCopy<T>(json: T): T {
        try {
            return JSON.parse(JSON.stringify(json))
            // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (error) {
            const _json = JSON.parse(JsonHelper.Stringify(json))
            JsonHelper.RemoveUselessKeys(_json)
            return _json
        }
    }

    static Size<T>(json: T): number {
        const jsonString = JsonHelper.Stringify(json)
        return Buffer.byteLength(jsonString, 'utf8')
    }

    static RemoveUselessKeys(obj: any): void {
        _.forOwn(obj, (value, key) => {
            if (_.isObject(value)) {
                JsonHelper.RemoveUselessKeys(value)
            }
            // eslint-disable-next-line you-dont-need-lodash-underscore/is-array
            if (["[Object]", "[Array]"].includes(value) || (_.isArray(value) && value.every(v => v === null))) {
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

        // eslint-disable-next-line you-dont-need-lodash-underscore/for-each
        _.forEach(obj, (value, key) => {
            const newKey = `${prefix}${key}`
            // eslint-disable-next-line you-dont-need-lodash-underscore/is-array
            result[newKey] = _.isObject(value) && value !== null && !_.isArray(value)
                ? JsonHelper.PrefixKeys(value as TJson, prefix)
                : value
        })

        return result
    }


    static IsEmpty<T>(obj: Dictionary<T>): boolean {
        return _.isEmpty(obj)
    }

    static ReplaceStrings(obj: TJson, pattern: RegExp, replacement: string): TJson {
        // eslint-disable-next-line you-dont-need-lodash-underscore/for-each
        _.forEach(obj, (v, k) => {
            // eslint-disable-next-line you-dont-need-lodash-underscore/is-string
            if (_.isString(v)) {
                obj[k] = v.replace(pattern, replacement)
            }
            if (JsonHelper.IsJson(v)) {
                obj[k] = JsonHelper.ReplaceStrings(v as TJson, pattern, replacement)
            }
            if (Array.isArray(v)) {
                obj[k] = v.map(vv => JsonHelper.ReplaceStrings(vv as TJson, pattern, replacement))
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

}