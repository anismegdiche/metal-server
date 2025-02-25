/* eslint-disable @typescript-eslint/no-explicit-any */
//
//
//
//
//
import { JsonHelper } from "../lib/JsonHelper"
import { Logger } from "./Logger"
import { Synchronizer } from "./Synchronizer"


//
export class SynchronizerManager {

    static #SyncMap: Map<string, Synchronizer> = new Map() //NOSONAR

    static async Execute<T>(signature: string, fn: () => Promise<T>, ...args: any[]): Promise<T> {
        let sync = SynchronizerManager.#SyncMap.get(signature)

        if (!sync) {
            sync = new Synchronizer()
            SynchronizerManager.#SyncMap.set(signature, sync)
        }

        return sync.Execute(fn)
    }

    static Synchronized() {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            const originalMethod = descriptor.value
            descriptor.value = async function (...args: any[]) {
                const _filteredArgs = args
                const _argsString = (_filteredArgs.length == 0 || _filteredArgs.every(v => v === null) || _filteredArgs.every(v => v === undefined))
                    ? ''
                    : `: ${JsonHelper.Stringify(_filteredArgs)}`

                const signature = `${target.name ?? this.constructor.name}.${propertyKey}${_argsString}`
                Logger.Debug(`SynchronizerManager: Function signature = ${signature}`)

                const result = await SynchronizerManager.Execute(signature, originalMethod.bind(this, ...args))

                // Check the result and decide whether to continue to the original method
                if (result !== undefined) {
                    return result
                }

                // If result is undefined, continue to the original method
                return originalMethod.apply(this, args)
            }

            return descriptor
        }
    }
}
