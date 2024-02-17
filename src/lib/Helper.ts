//
//
//
//
//
import _ from "lodash"
//
import { TJson } from "../types/TJson"
import { Logger } from "./Logger"
import { Validator } from "jsonschema"


export class Helper {

    static JsonValidator = new Validator()

    static CaseMapNotFound(key: string): undefined {
        Logger.Error(`Key '${key}' not found`)
        return undefined
    }

    static HasExpectedProperties(myObject: any, expectedProperties: string[]): boolean {
        for (const [key] of Object.entries(myObject)) {
            if (!expectedProperties.includes(key)) {
                return false
            }
        }
        return true
    }

    static JsonTryParse<T>(text: string, defaultValue: T): T {
        try {
            return JSON.parse(text)
        } catch (error) {
            Logger.Error(`JsonTryParse Error: ${JSON.stringify(error)}`)
            return defaultValue
        }
    }

    static JsonGet<T>(json: TJson, jsonPath: string | undefined = undefined): T {
        return jsonPath
            // eslint-disable-next-line you-dont-need-lodash-underscore/get
            ? _.get(json, jsonPath) as T
            : json as T
    }

    static JsonSet<T>(json: T, jsonPath: string | undefined, data: TJson[] | undefined): T {
        if (!data)
            return json

        return jsonPath
            ? _.set(json as [], jsonPath, data) as T
            : data as T
    }
}