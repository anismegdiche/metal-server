import "reflect-metadata"
import { autoDiscover } from "@metal/messaging/auto-discover"
import { ZmqSubscriber } from "@metal/messaging/subscriber"
import { MetricsConsumer } from "./metrics.consumer"
import { MetricsRepository } from "./metrics.repository"

async function bootstrap() {
	const subscriber = new ZmqSubscriber()

	// Create dependencies manually
	const repository = new MetricsRepository()
	const consumer = new MetricsConsumer(repository)

	// Discover and register handlers
	const { discoverHandlers } = await import("@metal/messaging/registry")
	const handlers = discoverHandlers(consumer)
	
	for (const h of handlers) {
		subscriber.register(h.topic, h.handler)
		console.log(`[Bootstrap] Registered handler for topic: ${h.topic}`)
	}

	await subscriber.connect("tcp://localhost:5555")

	console.log("Worker listening on tcp://localhost:5555")
}

bootstrap()
