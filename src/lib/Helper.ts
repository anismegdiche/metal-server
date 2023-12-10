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
}