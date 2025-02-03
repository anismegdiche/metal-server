//
//
//
//
//
import _, { Dictionary } from "lodash"
import { configure } from 'safe-stable-stringify'
import * as chrono from 'chrono-node'

//
import { TJson } from "../types/TJson"
import { Logger } from "../utils/Logger"

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

    static Get<T>(json: TJson, jsonPath?: string): T {
        return jsonPath
            // eslint-disable-next-line you-dont-need-lodash-underscore/get
            ? _.get(json, jsonPath) as T
            : json as T
    }

    static Set<T>(json: T, jsonPath: string | undefined, data: TJson[] | undefined): T {
        if (!data)
            return json

        return jsonPath
            ? _.set(json as [], jsonPath, data) as T
            : data as T
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