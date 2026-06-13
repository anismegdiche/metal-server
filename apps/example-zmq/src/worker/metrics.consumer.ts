import { Message } from "@metal/messaging/decorators/message"
import { Retry } from "@metal/messaging/decorators/retry"
import { Timeout } from "@metal/messaging/decorators/timeout"
import { Validate, type ValidationSchema } from "@metal/messaging/decorators/validate"
import { Injectable } from "@metal/messaging/di/container"
import type { MetricsRepository } from "./metrics.repository"

const metricsCreatedSchema: ValidationSchema = (data: unknown) => {
	if (typeof data !== "object" || data === null) {
		return { valid: false, errors: ["payload must be an object"] }
	}

	const d = data as Record<string, unknown>

	if (typeof d.id !== "string") {
		return { valid: false, errors: ["id must be a string"] }
	}

	if (typeof d.cpu !== "number") {
		return { valid: false, errors: ["cpu must be a number"] }
	}

	return { valid: true }
}

@Injectable()
export class MetricsConsumer {
	constructor(private readonly repository: MetricsRepository) {}

	@Message("metrics.created")
	@Validate(metricsCreatedSchema)
	@Retry(3, 200)
	@Timeout(5000)
	async handleMetricsCreated(data: any) {
		console.log("received metrics", data)

		await this.repository.save(data)
	}

	@Message("metrics.deleted")
	async handleMetricsDeleted(data: any) {
		console.log("deleted metrics", data)
	}
}
