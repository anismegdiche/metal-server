/* eslint-disable @typescript-eslint/no-explicit-any */
//
//
//
import * as _ from "lodash-es"
import { DecoratorUtils } from "./DecoratorUtils"
//
import { JsonUtils } from "./JsonUtils"
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
		return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
			const originalMethod = descriptor.value

			descriptor.value = async function (...args: any[]) {
				const _paramObject = DecoratorUtils.GetParameters(originalMethod, ...args)
				const _filteredParams = _.chain(_paramObject)
					.omitBy(_.isNil || _.isEmpty)
					.pick(pick ?? _.keys(_paramObject))
					.value()

				const signature = `${target.name ?? this.constructor.name}.${propertyKey}, ${JsonUtils.Stringify(_filteredParams)}`
				Logger.Debug(`${Logger.In} SynchronizerManager: syncing ${target.name ?? this.constructor.name}.${propertyKey}`)

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
