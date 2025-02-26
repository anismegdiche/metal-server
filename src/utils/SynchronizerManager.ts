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
import { DecoratorHelper } from "./DecoratorHelper"


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
                const _paramObject = DecoratorHelper.GetParameters(originalMethod, ...args)
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
}
