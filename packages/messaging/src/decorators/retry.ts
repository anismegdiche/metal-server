export const RETRY_METADATA = Symbol("retry")

export function Retry(attempts: number, delayMs: number = 0) {
	return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
		const original = descriptor.value

		descriptor.value = async function (...args: any[]) {
			let lastError: unknown

			for (let i = 0; i < attempts; i++) {
				try {
					return await original.apply(this, args)
				} catch (err) {
					lastError = err
					if (delayMs > 0 && i < attempts - 1) {
						await new Promise((r) => setTimeout(r, delayMs))
					}
				}
			}

			throw lastError
		}

		Reflect.defineMetadata(RETRY_METADATA, { attempts, delayMs }, descriptor.value)
		return descriptor
	}
}
