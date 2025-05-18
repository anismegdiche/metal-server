//
//
//
//
//
import { Logger } from "../utils/Logger"


export class Helper {

    @Logger.LogFunction()
    static CaseMapNotFound(key: string): undefined {
        Logger.Error(`Key '${key}' not found`)
        return undefined
    }
}