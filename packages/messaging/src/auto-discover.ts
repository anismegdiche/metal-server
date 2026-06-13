import { INJECTABLE_METADATA, Container } from "./di/container"
import { discoverHandlers } from "./registry"
import { ZmqSubscriber } from "./subscriber"

export async function autoDiscover(subscriber: ZmqSubscriber, ...classes: (new (...args: any[]) => any)[]) {
	const container = new Container()

	for (const ctor of classes) {
		const isInjectable = Reflect.getMetadata(INJECTABLE_METADATA, ctor)

		if (!isInjectable) {
			console.warn(`Skipping ${ctor.name}: missing @Injectable decorator`)
			continue
		}

		console.log(`[AutoDiscover] Creating instance of ${ctor.name}`)
		const instance = container.get(ctor)
		const handlers = discoverHandlers(instance)

		console.log(`[AutoDiscover] Found ${handlers.length} handlers for ${ctor.name}`)
		for (const h of handlers) {
			subscriber.register(h.topic, h.handler)
		}
	}
}
