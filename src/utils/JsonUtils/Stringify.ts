//
//
//
import { configure } from 'safe-stable-stringify'


//
const SafeStableStringify = configure({
    circularValue: undefined,
    maximumDepth: 5
})


//
export function Stringify<T>(json: T): string {
    try {
        return JSON.stringify(json)
    } catch (error) {
        return SafeStableStringify(json) ?? ""
    }
}