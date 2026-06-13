export const TIMEOUT_METADATA = Symbol("timeout")

export function Timeout(ms: number) {
	return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
		const original = descriptor.value

		descriptor.value = async function (...args: any[]) {
			const result = await Promise.race([
				original.apply(this, args),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error(`Handler timed out after ${ms}ms`)), ms),
				),
			])

			return result
		}

		Reflect.defineMetadata(TIMEOUT_METADATA, ms, descriptor.value)
		return descriptor
	}
}
