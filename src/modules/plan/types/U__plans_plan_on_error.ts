/** biome-ignore-all lint/suspicious/noThenProperty: <explanation> */
//
//
//
import z from "zod"
//
import { z_entity, z_schema } from "../../schema/types/TSchemaRequest"
import { STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_RETRY_THEN, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY } from "../@consts"


//
export const z__on_error_scope = z
	.enum(STEP_ON_ERROR_SCOPE, { message: "Invalid on-error.scope: must be one of: step, row, plan, or entity" })
	.default(STEP_ON_ERROR_SCOPE.STEP)
	.describe("Error scope");

export const z__on_error_retry = z
	.object({
		attempts: z
			.number()
			.min(1, { message: "on-error.retry.attempts must be at least 1" })
			.default(3)
			.describe("Maximum retry attempts"),
		delay: z
			.number()
			.min(0, { message: "on-error.retry.delay must be at least 0" })
			.default(1000)
			.describe("Delay between retries in milliseconds"),
		backoff: z
			.enum(STEP_ON_ERROR_RETRY_BACKOFF, { message: "Invalid on-error.retry.backoff: must be one of: fixed, exponential, linear" })
			.default(STEP_ON_ERROR_RETRY_BACKOFF.FIXED)
			.describe("Backoff strategy"),
		"max-delay": z
			.number()
			.min(0, { message: "on-error.retry.max-delay must be at least 0" })
			.default(30000)
			.describe("Maximum delay for exponential/linear backoff"),
		"then": z
			.enum(STEP_ON_ERROR_RETRY_THEN)
			.default(STEP_ON_ERROR_RETRY_THEN.THROW)
			.describe("Fallback strategy after retries"),
	}).describe("Retry configuration")

export const z__on_error_sink = z.object({
	schema: z_schema
		.describe("Error destination schema"),
	entity: z_entity
		.describe("Error destination entity"),
	"include-error": z
		.boolean()
		.default(true)
		.describe("Include error details in sink"),
	"error-field": z
		.string()
		.default("error_details")
		.describe("Field name for error details"),
}).describe("Sink configuration")

//
export const z_U__on_error_strategy_throw = z
	.object({
		strategy: z
			.literal(STEP_ON_ERROR_STRATEGY.THROW),
		scope: z
			.literal(STEP_ON_ERROR_SCOPE.STEP)
			.default(STEP_ON_ERROR_SCOPE.STEP)
			.optional(),
	})
	.describe("Throw strategy configuration")

export const z_U__on_error_strategy_skip = z
	.object({
		strategy: z
			.literal(STEP_ON_ERROR_STRATEGY.SKIP),
		scope: z__on_error_scope.optional(),
	})
	.describe("Skip strategy configuration")

export const z_U__on_error_strategy_retry = z
	.object({
		strategy: z
			.literal(STEP_ON_ERROR_STRATEGY.RETRY),
		scope: z__on_error_scope
			.optional(),
		retry: z__on_error_retry,
		sink: z__on_error_sink.optional()
	})
	.describe("Retry strategy configuration")

export const z_U__on_error_strategy_sink = z
	.object({
		strategy: z
			.literal(STEP_ON_ERROR_STRATEGY.SINK),
		scope: z__on_error_scope
			.optional(),
		sink: z__on_error_sink,
	})
	.describe("Sink strategy configuration")

//
export const z_U__on_error_Params = z
	.discriminatedUnion("strategy", [
		z_U__on_error_strategy_throw,
		z_U__on_error_strategy_skip,
		z_U__on_error_strategy_retry,
		z_U__on_error_strategy_sink
	])
	.describe("Error handling configuration")


export const z_U__on_error = z
	.object({
		"on-error": z_U__on_error_Params
	})
	.default({
		"on-error": {
			strategy: STEP_ON_ERROR_STRATEGY.THROW
		}
	})
	.describe("Error handling configuration")


//
export type U__on_error_strategy_throw = z.infer<typeof z_U__on_error_strategy_throw>
export type U__on_error_strategy_skip = z.infer<typeof z_U__on_error_strategy_skip>
export type U__on_error_strategy_retry = z.infer<typeof z_U__on_error_strategy_retry>
export type U__on_error_strategy_sink = z.infer<typeof z_U__on_error_strategy_sink>

//
export type U__on_error_Params = z.infer<typeof z_U__on_error_Params>
export type U__on_error = z.infer<typeof z_U__on_error>