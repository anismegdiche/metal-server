//
//
//
//
//
import _ from "lodash"
import { Validator } from "jsonschema"
import { configure } from 'safe-stable-stringify'
//
import { TJson } from "../types/TJson"
import { Logger } from "./Logger"

const SafeStableStringify = configure({
    circularValue: undefined,
    maximumDepth: 5
})


export class JsonHelper {

    static readonly Validator = new Validator()

    static TryParse<T>(jsonString: string, defaultValue: T): T {
        try {
            return JSON.parse(jsonString, (key, value) => {
                if (typeof value === 'string') {
                    const date = new Date(value)
                    if (!Number.isNaN(date.getTime())) {
                        return date
                    }
                }
                return value
            })
        } catch (error) {
            Logger.Error(`JsonHelper.TryParse Error: ${JsonHelper.Stringify(error)}`)
            return defaultValue
        }
    }

    static Get<T>(json: TJson, jsonPath: string | undefined = undefined): T {
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
        } catch (error) {
            return SafeStableStringify(json) ?? ""
        }
    }

    static SafeCopy<T>(json: T): T {
        try {
            return JSON.parse(JSON.stringify(json))
        } catch (error) {
            return JSON.parse(JsonHelper.Stringify(json))
        }
    }

    static Size<T>(json: T): number {
        const jsonString = JsonHelper.Stringify(json)
        return Buffer.byteLength(jsonString, 'utf8')
    }
}