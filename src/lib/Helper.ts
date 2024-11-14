//
//
//
//
//
import _ from "lodash"
import { Logger } from "../utils/Logger"


export class Helper {

    @Logger.LogFunction()
    static CaseMapNotFound(key: string): undefined {
        Logger.Error(`Key '${key}' not found`)
        return undefined
    }

    //@Logger.DebugFunction()
    static HasExpectedProperties<T>(obj: T, expectedProps: (keyof T)[] | string[]): boolean {
        return expectedProps.every(prop => _.has(obj, prop))
    }
}