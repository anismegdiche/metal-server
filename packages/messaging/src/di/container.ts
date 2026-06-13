import "reflect-metadata"

export const INJECTABLE_METADATA = Symbol("injectable")
const CONSTRUCTOR_PARAMS_METADATA = Symbol("constructorParams")

export function Injectable(): ClassDecorator {
	return (target: any) => {
		Reflect.defineMetadata(INJECTABLE_METADATA, true, target)
	}
}

// Type hint decorator to register constructor parameter types
export function Param(index: number, type: any) {
	return (target: any) => {
		const existing = Reflect.getOwnMetadata(CONSTRUCTOR_PARAMS_METADATA, target) || {}
		existing[index] = type
		Reflect.defineMetadata(CONSTRUCTOR_PARAMS_METADATA, existing, target)
	}
}

export class Container {
	private instances = new Map<string, any>()

	get<T>(ctor: new (...args: any[]) => T): T {
		const key = ctor.name

		if (this.instances.has(key)) {
			return this.instances.get(key)!
		}

		// Try to get design:paramtypes (TypeScript metadata)
		let paramTypes: any[] = Reflect.getMetadata("design:paramtypes", ctor) ?? []
		
		// Fall back to manually registered params
		if (paramTypes.length === 0) {
			const manualParams = Reflect.getMetadata(CONSTRUCTOR_PARAMS_METADATA, ctor)
			if (manualParams) {
				paramTypes = Object.values(manualParams)
				console.log(`[Container] Using manually registered params for ${ctor.name}`)
			}
		}

		console.log(`[Container] Resolving ${ctor.name} with ${paramTypes.length} dependencies`)
		
		const deps = paramTypes.map((dep: any, idx: number) => {
			if (!dep) {
				console.warn(`[Container]   Dependency ${idx}: undefined - skipping`)
				return undefined
			}
			console.log(`[Container]   Dependency ${idx}: ${dep.name}`)
			return this.get(dep)
		})
		
		const instance = new ctor(...deps)
		this.instances.set(key, instance)
		console.log(`[Container] Created instance of ${ctor.name}`)

		return instance
	}
}
