import "reflect-metadata"

const MESSAGE_METADATA = Symbol("message")

export function Message(topic: string) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		Reflect.defineMetadata(MESSAGE_METADATA, topic, descriptor.value)
		return descriptor
	}
}

export { MESSAGE_METADATA }
