//
//
//
//
//
import _ from 'lodash'
//
import { Logger } from "./Logger"


export class Helper {
    static CaseMapNotFound(key: string): undefined {
        Logger.Error(`Key '${key}' not found`)
        return undefined
    }

    static HasExpectedProperties(myObject: any, expectedProperties: string[]): boolean {
        const commonProperties = _.intersection(Object.keys(myObject), expectedProperties)
        return _.isEqual(commonProperties, expectedProperties)
    }
}