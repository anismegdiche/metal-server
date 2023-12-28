//
//
//
//
//
import { Logger } from "./Logger"


export class Helper {
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
}