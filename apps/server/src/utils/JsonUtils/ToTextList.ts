import { forEach } from "lodash-es"
import type { TJson } from "../../types/TJson"
import { Stringify } from "./Stringify"

export function ToTextList(json?: TJson): string {
    if (!json) {
        return ""
    }

    const result: string[] = []
    forEach(json, (value, key) => {
        if (value) {
            result.push(` - ${key}: ${Stringify(value)}`)
        }
    })
    return result.join("\r\n")
}
