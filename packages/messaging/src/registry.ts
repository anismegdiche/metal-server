import { MESSAGE_METADATA } from "./decorators/message"

export interface HandlerDefinition {
	topic: string
	handler: (payload: any) => Promise<void>
	instance: any
}

export function discoverHandlers(instance: any): HandlerDefinition[] {
	const proto = Object.getPrototypeOf(instance)
	const handlers: HandlerDefinition[] = []

	for (const key of Object.getOwnPropertyNames(proto)) {
		if (key === "constructor") continue

		const method = proto[key]
		const topic = Reflect.getMetadata(MESSAGE_METADATA, method)

		if (!topic) continue

		handlers.push({
			topic,
			handler: method.bind(instance),
			instance,
		})

		console.log(`[Registry] Discovered handler for topic: ${topic}`)
	}

	return handlers
}
