//
//
//
import { Semaphore } from "./Semaphore"

// Global storage for mutex instances
const mutexStore = new WeakMap<object, Map<string | symbol, Mutex>>()
const valueStore = new WeakMap<object, Map<string | symbol, unknown>>()

 
export class Mutex extends Semaphore {
    constructor() {
        super(1)
    }

    /**
     * Decorator that creates a mutex-protected variable
     * Usage: @Mutex.Once() let x = 0
     */
    static Set<T = unknown>() {
        return function (target: object, propertyKey: string | symbol): void {
            const mutex = new Mutex()
            
            // Initialize stores for this instance if they don't exist
            if (!mutexStore.has(target)) {
                mutexStore.set(target, new Map())
                valueStore.set(target, new Map())
            }
            
            const instanceMutexes = mutexStore.get(target)!
            const instanceValues = valueStore.get(target)!
            
            // Store the mutex and initialize the value
            instanceMutexes.set(propertyKey, mutex)
            instanceValues.set(propertyKey, undefined)
            
            // Define the property with getter/setter
            Object.defineProperty(target, propertyKey, {
                get(): Promise<T> {
                    const mutex = instanceMutexes.get(propertyKey)!
                    return mutex.Acquire().then(() => {
                        try {
                            return instanceValues.get(propertyKey) as T
                        } finally {
                            mutex.Release()
                        }
                    })
                },
                set(newValue: T): void {
                    instanceValues.set(propertyKey, newValue)
                },
                configurable: true,
                enumerable: true
            })
        }
    }
}
