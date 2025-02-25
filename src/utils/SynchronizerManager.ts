/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
//
//
//
//
//
import _ from "lodash"
//
import { JsonHelper } from "../lib/JsonHelper"
import { Logger } from "./Logger"
import { Synchronizer } from "./Synchronizer"


//
export class SynchronizerManager {

    static #SyncMap: Map<string, Synchronizer> = new Map() //NOSONAR

    static async Execute<T>(signature: string, fn: () => Promise<T>, ..._args: any[]): Promise<T> {
        let sync = SynchronizerManager.#SyncMap.get(signature)

        if (!sync) {
            sync = new Synchronizer()
            SynchronizerManager.#SyncMap.set(signature, sync)
        }

        return sync.Execute(fn)
    }

    static Synchronized(pick?: string[]) {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            const originalMethod = descriptor.value

            descriptor.value = async function (...args: any[]) {
                // Get parameter names using reflection
                const _paramNames = SynchronizerManager.#GetParameterNames(originalMethod)
                const _paramObject = Object.fromEntries(_paramNames.map((name, index) => [name, args[index]]))

                const _filteredParams = _.chain(_paramObject)
                    .omitBy(_.isNil || _.isEmpty)
                    // eslint-disable-next-line you-dont-need-lodash-underscore/keys
                    .pick(pick ?? _.keys(_paramObject))
                    .value()

                const signature = `${target.name ?? this.constructor.name}.${propertyKey}, ${JsonHelper.Stringify(_filteredParams)}`
                Logger.Debug(`SynchronizerManager: Function signature = ${signature}`)

                const result = await SynchronizerManager.Execute(signature, originalMethod.bind(this, ...args))

                if (result !== undefined) {
                    return result
                }

                return originalMethod.apply(this, args)
            }

            return descriptor
        }
    }

    static #GetParameterNames(func: Function): string[] {
        const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
        const ARGUMENT_NAMES = /([^\s,]+)/g
        const fnStr = func.toString().replace(STRIP_COMMENTS, '')
        const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES)
        return result || []
    }
}
