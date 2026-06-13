export const VALIDATE_METADATA = Symbol("validate")

export type ValidationSchema = (data: unknown) => { valid: boolean; errors?: string[] }

export function Validate(schema: ValidationSchema) {
	return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
		const original = descriptor.value

		descriptor.value = async function (data: unknown, ...rest: any[]) {
			const result = schema(data)

			if (!result.valid) {
				throw new Error(`Validation failed: ${result.errors?.join(", ")}`)
			}

			return original.apply(this, [data, ...rest])
		}

		Reflect.defineMetadata(VALIDATE_METADATA, schema, descriptor.value)
		return descriptor
	}
}
